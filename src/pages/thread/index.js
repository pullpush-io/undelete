import React from 'react'
import { Link } from 'react-router-dom'
import {
  getPost,
  getComments as getRedditComments,
  chunkSize as redditChunkSize
} from '../../api/reddit'
import {
  getPost as getPushshiftPost,
  getComments as getPushshiftComments,
  chunkSize as pushshiftChunkSize
} from '../../api/pushshift'
import { isDeleted, isRemoved, sleep } from '../../utils'
import { connect, constrainMaxComments } from '../../state'
import Post from '../common/Post'
import CommentSection from './CommentSection'
import SortBy from './SortBy'
import CommentInfo from './CommentInfo'
import LoadMore from './LoadMore'

// A FIFO queue with items pushed in individually, and shifted out in an Array of chunkSize
class ChunkedQueue {

  constructor(chunkSize) {
    if (!(chunkSize > 0))
      throw RangeError('chunkSize must be > 0')
    this._chunkSize = chunkSize
    this._chunks = [[]]  // Array of Arrays
    // Invariant: this._chunks always contains at least one Array
  }

  push(x) {
    const last = this._chunks[this._chunks.length - 1]
    if (last.length < this._chunkSize)
      last.push(x)
    else
      this._chunks.push([x])
  }

  hasFullChunk = () => this._chunks[0].length >= this._chunkSize * 0.9
  isEmpty      = () => this._chunks[0].length == 0

  shiftChunk() {
    const first = this._chunks.shift()
    if (this._chunks.length == 0)
      this._chunks.push([])
    return first
  }
}

// The .firstCreated of the contig containing a post's first comment (see contigs below)
const EARLIEST_CREATED = 1

class Thread extends React.Component {
  state = {
    post: {},
    pushshiftCommentLookup: new Map(),
    removed: 0,
    deleted: 0,
    loadedAllComments: false,
    loadingComments: true,
    reloadingComments: false
  }

  // A 'contig' is an object representing a contiguous block of comments currently being downloaded or already
  // downloaded, e.g. { firstCreated: #, lastCreated: # } (secs past the epoch; min. value of EARLIEST_CREATED)
  contigs = []  // sorted non-overlapping array of contig objects
  curContigIdx = 0
  curContig  () { return this.contigs[this.curContigIdx] }
  nextContig () { return this.contigs[this.curContigIdx + 1] }

  // If the current contig and the next probably overlap, merge them
  // (should only be called if there's another reason to believe they overlap)
  mergeContigs () {
    const nextContig = this.nextContig()
    if (this.curContig().lastCreated >= nextContig?.firstCreated)  // probably; definitely would be '>'
      nextContig.firstCreated = this.contigs.splice(this.curContigIdx, 1)[0].firstCreated
    else
      console.warn("Can't merge contigs", this.curContig(), "and", nextContig)  // shouldn't happen
  }

  redditIdsToPushshift (comment) {
    comment.parent_id = comment.parent_id?.substring(3) || this.props.match.params.threadID
    comment.link_id = comment.link_id?.substring(3)     || this.props.match.params.threadID
    return comment
  }

  commentIdAttempts = new Set()  // keeps track of attempts to load permalinks to avoid reattempts

  componentDidMount () {
    const { subreddit, threadID, commentID } = this.props.match.params
    this.props.global.setLoading('Loading post...')
    console.time('Load comments')

    // Get post from Reddit. Each code path below should end in either
    //   setLoading() on success (if comments are still loading), or
    //   setError() and assigning stopLoading = true on failure.
    getPost(threadID)
      .then(post => {
        document.title = post.title
        if (isDeleted(post.selftext))
          post.deleted = true
        else if (isRemoved(post.selftext) || post.removed_by_category)
          post.removed = true

        if (!post.deleted && !post.removed && !post.edited) {
          this.setState({ post })
          if (this.state.loadingComments)
            this.props.global.setLoading('Loading comments...')

        // Fetch the post from Pushshift if it was deleted/removed/edited
        } else {
          const redditSelftext = post.selftext
          post.selftext = '...'  // temporarily remove selftext to avoid flashing it onscreen
          this.setState({ post })
          getPushshiftPost(threadID)
            .then(origPost => {
              if (origPost) {

                // If found on Pushshift, and deleted on Reddit, use Pushshift's post instead
                if (post.deleted || post.removed) {
                  origPost.score = post.score
                  origPost.num_comments = post.num_comments
                  origPost.edited = post.edited
                  if (post.deleted)
                    origPost.deleted = true
                  else
                    origPost.removed = true
                  this.setState({ post: origPost })

                // If found on Pushshift, but it was only edited, update and use the Reddit post
                } else {
                  if (redditSelftext != origPost.selftext && !isRemoved(origPost.selftext)) {
                    post.selftext = origPost.selftext
                    post.edited_selftext = redditSelftext
                  } else
                    post.selftext = redditSelftext  // edited selftext not archived by Pushshift, use Reddit's
                  this.setState({ post })
                }

              // Else if not found on Pushshift, nothing to do except restore the selftext (removed above)
              } else {
                post.selftext = redditSelftext
                this.setState({ post })
              }

              if (this.state.loadingComments)
                this.props.global.setLoading('Loading comments...')
            })
            .catch(error => {
              console.timeEnd('Load comments')
              this.props.global.setError(error, error.helpUrl)
              this.stopLoading = true
              post.selftext = redditSelftext  // restore it (after temporarily removing it above)
              this.setState({ post })
            })
        }
      })
      .catch(error => {
        const origMessage = error.origError?.message

        // Fetch the post from Pushshift if quarantined/banned (403) or not found (404)
        if (origMessage && (origMessage.startsWith('403') || origMessage.startsWith('404'))) {
          getPushshiftPost(threadID)
            .then(removedPost => {
              if (removedPost) {
                document.title = removedPost.title
                this.setState({ post: { ...removedPost, removed: true } })
                if (this.state.loadingComments)
                  this.props.global.setLoading('Loading comments...')
              } else {
                if (origMessage.startsWith('403')) {  // If Reddit admits it exists but Pushshift can't find it, then
                  this.setState({ post: { id: threadID, subreddit, removed: true } })  // create a dummy post and continue
                  if (this.state.loadingComments)
                    this.props.global.setLoading('Loading comments...')
                } else {
                  console.timeEnd('Load comments')
                  this.props.global.setError({ message: '404 Post not found' })
                  this.stopLoading = true
                }
              }
            })
            .catch(error => {
              console.timeEnd('Load comments')
              this.props.global.setError(error, error.helpUrl)
              this.stopLoading = true
            })

        } else {
          console.timeEnd('Load comments')
          this.props.global.setError(error, error.helpUrl)
          this.stopLoading = true
        }
      })

    // The max_comments query parameter can increase the initial comments-to-download
    const maxComments = Math.max(this.props.global.maxComments, constrainMaxComments(
      parseInt((new URLSearchParams(this.props.location.search)).get('max_comments'))))

    // Get comments starting from the earliest available (not a permalink)
    if (commentID === undefined) {
      this.contigs.unshift({firstCreated: EARLIEST_CREATED})
      this.getComments(maxComments)

    // Get comments starting from the permalink if possible, otherwise from the earliest available
    } else {
      this.commentIdAttempts.add(commentID)
      getRedditComments([commentID])
        .then(([comment]) => {
          this.contigs.unshift({firstCreated: comment?.created_utc || EARLIEST_CREATED})
          this.getComments(maxComments, false, comment)
        })
        .catch(() => {
          this.contigs.unshift({firstCreated: EARLIEST_CREATED})
          this.getComments(maxComments)
        })
    }
  }

  // Updates this.curContigIdx based on URL's commentID if it's already downloaded.
  // Returns true on success, or false if not found (and then curContigIdx is not updated).
  updateCurContig () {
    const { commentID } = this.props.match.params
    let curContigIdx = -1
    if (commentID === undefined)
      curContigIdx = this.contigs[0].firstCreated == EARLIEST_CREATED ? 0 : -1
    else {
      const created_utc = this.state.pushshiftCommentLookup.get(commentID)?.created_utc
      if (created_utc > EARLIEST_CREATED)
        curContigIdx = this.contigs.findIndex(contig => created_utc >= contig.firstCreated && created_utc <= contig.lastCreated)
    }
    if (curContigIdx < 0)
      return false
    this.setCurContig(curContigIdx)
    return true
  }
  setCurContig (idx) {
    this.curContigIdx = idx
    // When the current contig changes, loadedAllComments might also change
    const loadedAllComments = Boolean(this.curContig().loadedAllComments)
    if (this.state.loadedAllComments != loadedAllComments)
      this.setState({loadedAllComments})
  }

  componentDidUpdate () {

    // If the max-to-download Reload button or 'load more comments' was clicked
    const { loadingMoreComments } = this.props.global.state
    if (loadingMoreComments) {
      this.props.global.state.loadingMoreComments = 0
      this.setState({reloadingComments: true})
      this.props.global.setLoading('Loading comments...')
      console.time('Load comments')
      this.updateCurContig()
      this.getComments(loadingMoreComments, true)

    // Otherwise if we're loading a comment tree we haven't downloaded yet
    } else if (!this.state.loadingComments && !this.state.reloadingComments && !this.updateCurContig()) {

      // If we haven't downloaded from the earliest available yet (not a permalink)
      const { commentID } = this.props.match.params
      if (commentID === undefined) {
        this.setState({loadingComments: true})
        this.props.global.setLoading('Loading comments...')
        console.time('Load comments')
        this.contigs.unshift({firstCreated: EARLIEST_CREATED})
        this.setCurContig(0)
        this.getComments(this.props.global.maxComments)

      // If we haven't downloaded this permalink yet
      } else if (!this.commentIdAttempts.has(commentID)) {
        this.commentIdAttempts.add(commentID)
        this.setState({reloadingComments: true})
        this.props.global.setLoading('Loading comments...')
        console.time('Load comments')
        let createdUtcNotFound  // true if Reddit doesn't have the comment's created_utc
        getRedditComments([commentID])
          .then(([comment]) => {
            const created_utc = comment?.created_utc
            if (created_utc > EARLIEST_CREATED) {
              let insertBefore = this.contigs.findIndex(contig => created_utc < contig.firstCreated)
              if (insertBefore == -1)
                insertBefore = this.contigs.length

              // If comment isn't inside an existing contig, create a new one and start downloading
              if (insertBefore == 0 || created_utc >= this.contigs[insertBefore - 1].lastCreated) {
                this.contigs.splice(insertBefore, 0, {firstCreated: created_utc})
                this.setCurContig(insertBefore)
                this.getComments(this.props.global.maxComments, false, comment)

              // Otherwise an earlier attempt to download it from Pushshift turned up nothing,
              } else {
                const { pushshiftCommentLookup } = this.state
                this.redditIdsToPushshift(comment)
                pushshiftCommentLookup.set(comment.id, comment)  // so use the Reddit comment instead
                this.setCurContig(insertBefore - 1)  // (this was the failed earlier attempt)
                console.timeEnd('Load comments')
                this.props.global.setSuccess()
                this.setState({pushshiftCommentLookup, loadingComments: false, reloadingComments: false})
              }
            } else
              createdUtcNotFound = true
          })
          .catch(() => createdUtcNotFound = true)
          .finally(() => {
            if (createdUtcNotFound) {
              // As a last resort, try to download starting from the previous contig;
              // this only occurs once per commentID due to the commentIdAttempts Set.
              if (this.curContigIdx > 0)
                this.setCurContig(this.curContigIdx - 1)
              // If there is no previous, create one
              else if (this.curContig().firstCreated != EARLIEST_CREATED)
                this.contigs.unshift({firstCreated: EARLIEST_CREATED})
              this.getComments(this.props.global.maxComments)
            }
          })
      }
    }
  }

  // Before calling, either create (and set to current) a new contig to begin downloading
  // after a new time, or set the current contig to begin adding to the end of that contig.
  //   persistent: if true, will try to continue downloading after the current contig has
  //               been completed and merged with the next contig.
  //  commentHint: a Reddit comment for use if Pushshift is missing that same comment.
  getComments (newCommentCount, persistent = false, commentHint = undefined) {
    const { threadID, commentID } = this.props.match.params
    const { pushshiftCommentLookup } = this.state
    const redditIdQueue = new ChunkedQueue(redditChunkSize)
    const pushshiftPromises = [], redditPromises = []
    let doRedditComments

    // Process a chunk of comments downloaded from Pushshift (called by getPushshiftComments() below)
    const processPushshiftComments = comments => {
      if (comments.length && !this.stopLoading) {
        pushshiftPromises.push(sleep(0).then(() => {
          let count = 0
          comments.forEach(comment => {
            const { id, parent_id } = comment
            if (!pushshiftCommentLookup.has(id)) {
              pushshiftCommentLookup.set(id, comment)
              redditIdQueue.push(id)
              count++
              // When viewing the full thread (to prevent false positives), if a parent_id is a comment
              // (not a post/thread) and it's missing from Pushshift, try to get it from Reddit instead.
              if (commentID === undefined && parent_id != threadID && !pushshiftCommentLookup.has(parent_id)) {
                pushshiftCommentLookup.set(parent_id, undefined)  // prevents adding it to the Queue multiple times
                redditIdQueue.push(parent_id)
              }
            }
          })
          while (redditIdQueue.hasFullChunk())
            doRedditComments(redditIdQueue.shiftChunk())
          return count
        }))
      }
      return !this.stopLoading  // causes getPushshiftComments() to exit early if set
    }

    // Download a list of comments by id from Reddit, and process them
    doRedditComments = ids => redditPromises.push(getRedditComments(ids)
      .then(comments => {
        comments.forEach(comment => {
          let pushshiftComment = pushshiftCommentLookup.get(comment.id)
          if (pushshiftComment === undefined) {
            // When a parent comment is missing from pushshift, use the reddit comment instead
            pushshiftComment = this.redditIdsToPushshift(comment)
            pushshiftCommentLookup.set(comment.id, pushshiftComment)
          } else {
            // Replace pushshift score with reddit (it's usually more accurate)
            pushshiftComment.score = comment.score
          }

          // Check what is removed / deleted according to reddit
          let removed = 0, deleted = 0
          if (isRemoved(comment.body)) {
            removed++
            pushshiftComment.removed = true
          } else if (isDeleted(comment.body)) {
            deleted++
            pushshiftComment.deleted = true
          } else if (pushshiftComment !== comment) {
            if (isRemoved(pushshiftComment.body)) {
              // If it's deleted in pushshift, but later restored by a mod, use the restored
              this.redditIdsToPushshift(comment)
              pushshiftCommentLookup.set(comment.id, comment)
            } else if (pushshiftComment.body != comment.body) {
              pushshiftComment.edited_body = comment.body
              pushshiftComment.edited = comment.edited
            }
          }
          this.setState({ removed: this.state.removed + removed, deleted: this.state.deleted + deleted })
        })
        return comments.length
      })
      .catch(error => {
        console.timeEnd('Load comments')
        this.props.global.setError(error, error.helpUrl)
        this.stopLoading = true
      })
    )

    // Download comments from Pushshift into the current contig, and process each chunk (above) as it's retrieved
    const after = this.curContig().lastCreated - 1 || this.curContig().firstCreated - 1
    const before = this.nextContig()?.firstCreated + 1
    getPushshiftComments(processPushshiftComments, threadID, newCommentCount, after, before)
      .then(([lastCreatedUtc, curContigLoadedAll]) => {

        // Update the contigs array
        if (curContigLoadedAll) {
          if (before) {
            this.curContig().lastCreated = before - 1
            this.mergeContigs()
          } else {
            this.curContig().lastCreated = lastCreatedUtc
            this.curContig().loadedAllComments = true
          }
        } else
          this.curContig().lastCreated = lastCreatedUtc
        if (this.stopLoading)
          return

        // Finished retrieving comments from Pushshift; wait for processing to finish
        this.props.global.setLoading('Comparing comments...')
        Promise.all(pushshiftPromises).then(lengths => {
          const pushshiftComments = lengths.reduce((a,b) => a+b, 0)
          console.log('Pushshift:', pushshiftComments, 'comments')

          // If Pushshift didn't find the Reddit commentHint, but should have, use Reddit's comment
          if (commentHint && !pushshiftCommentLookup.has(commentHint.id) &&
              commentHint.created_utc >= this.curContig().firstCreated && (
                commentHint.created_utc < this.curContig().lastCreated || curContigLoadedAll
              )) {
            this.redditIdsToPushshift(commentHint)
            pushshiftCommentLookup.set(commentHint.id, commentHint)
            commentHint = undefined
          }

          // All comments from Pushshift have been processed; wait for Reddit to finish
          while (!redditIdQueue.isEmpty())
            doRedditComments(redditIdQueue.shiftChunk())
          Promise.all(redditPromises).then(lengths => {
            console.log('Reddit:', lengths.reduce((a,b) => a+b, 0), 'comments')

            if (!this.stopLoading) {
              const loadedAllComments = Boolean(this.curContig().loadedAllComments)
              if (persistent && !loadedAllComments && pushshiftComments <= newCommentCount - pushshiftChunkSize)
                this.getComments(newCommentCount - pushshiftComments, true, commentHint)

              else {
                console.timeEnd('Load comments')
                this.props.global.setSuccess()
                this.setState({
                  pushshiftCommentLookup,
                  removed: this.state.removed,
                  deleted: this.state.deleted,
                  loadedAllComments,
                  loadingComments: false,
                  reloadingComments: false
                })
              }
            }
          })
        })
      })
      .catch(e => {
        console.timeEnd('Load comments')
        this.props.global.setError(e, e.helpUrl)
        if (this.curContig().lastCreated === undefined) {
          this.contigs.splice(this.curContigIdx, 1)
          if (this.curContigIdx >= this.contigs.length)
            this.setCurContig(this.contigs.length - 1)
        }
      })
  }

  componentWillUnmount () {
    this.stopLoading = true
  }

  render () {
    const { subreddit, id, author } = this.state.post
    const { commentID } = this.props.match.params
    const reloadingComments = this.state.loadingComments ||
                              this.state.reloadingComments ||
                              this.props.global.state.loadingMoreComments
    const linkToRestOfComments = `/r/${subreddit}/comments/${id}/_/`

    const isSingleComment = commentID !== undefined
    const root = isSingleComment ? commentID : id

    return (
      <>
        <Post {...this.state.post} reloadingComments={reloadingComments} />
        <CommentInfo
          total={this.state.pushshiftCommentLookup.size}
          removed={this.state.removed}
          deleted={this.state.deleted}
        />
        <SortBy
          loadedAllComments={this.state.loadedAllComments}
          reloadingComments={reloadingComments}
          total={this.state.pushshiftCommentLookup.size}
        />
        {
          (!this.state.loadingComments && root) &&
          <>
            {isSingleComment &&
              <div className='view-rest-of-comment'>
                <div>you are viewing a single comment's thread.</div>
                {this.state.reloadingComments ?
                  <div className='faux-link'>view the rest of the comments</div> :
                  <Link to={linkToRestOfComments}>view the rest of the comments</Link>
                }
              </div>
            }
            <CommentSection
              root={root}
              postID={id}
              comments={this.state.pushshiftCommentLookup}
              postAuthor={isDeleted(author) ? null : author}
              commentFilter={this.props.global.state.commentFilter}  // need to explicitly
              commentSort={this.props.global.state.commentSort}      // pass in these props
              reloadingComments={reloadingComments}                  // to ensure React.memo
              total={this.state.pushshiftCommentLookup.size}         // works correctly
            />
            <LoadMore
              loadedAllComments={this.state.loadedAllComments}
              reloadingComments={reloadingComments}
              total={this.state.pushshiftCommentLookup.size}
            />
          </>
        }
      </>
    )
  }
}

export default connect(Thread)
