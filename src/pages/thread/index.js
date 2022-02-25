import React from 'react'
import { Link } from 'react-router-dom'
import {
  getPost,
  getComments as getRedditComments
} from '../../api/reddit'
import {
  getPost as getRemovedPost,
  getComments as getPushshiftComments
} from '../../api/pushshift'
import { isDeleted, isRemoved } from '../../utils'
import { connect, constrainMaxComments } from '../../state'
import Post from '../common/Post'
import CommentSection from './CommentSection'
import SortBy from './SortBy'
import CommentInfo from './CommentInfo'
import LoadMore from './LoadMore'

class Thread extends React.Component {
  state = {
    post: {},
    pushshiftCommentLookup: new Map(),
    removed: [],
    deleted: [],
    loadedAllComments: false,
    loadingComments: true,
    reloadingComments: false
  }

  componentDidMount () {
    const { subreddit, threadID } = this.props.match.params
    let maxCommentsQuery = parseInt((new URLSearchParams(this.props.location.search)).get('max_comments'))
    if (maxCommentsQuery > this.props.global.state.maxComments)
      // Directly mutating the state is not recommended, but it's only done once and is probably OK here
      this.props.global.state.maxComments = this.curMaxComments = constrainMaxComments(maxCommentsQuery)
    else
      this.curMaxComments = this.props.global.state.maxComments
    this.props.global.setLoading('Loading post...')

    // Get post from reddit
    getPost(subreddit, threadID)
      .then(post => {
        document.title = post.title
        this.setState({ post })
        // Fetch the post from pushshift if it was deleted/removed
        if (isDeleted(post.selftext) || isRemoved(post.selftext) || post.removed_by_category) {
          getRemovedPost(threadID)
            .then(removedPost => {
              const displayedPost = removedPost === undefined ? post : removedPost
              if (isDeleted(post.selftext)) {
                displayedPost.deleted = true
              } else {
                displayedPost.removed = true
              }
              this.setState({ post: displayedPost })
            })
        }
      })
      .catch(error => {
        this.props.global.setError(error)
        // Fetch the post from pushshift on other errors (e.g. posts from banned subreddits)
        getRemovedPost(threadID)
          .then(removedPost => {
            document.title = removedPost.title
            this.setState({ post: { ...removedPost, removed: true } })
          })
          .catch(error => {
            this.props.global.setError(error)
            // Create a dummy post so that comments will still be displayed
            this.setState({ post: { subreddit, id: threadID } })
          })
      })
      .finally(() => {
        if (this.state.loadingComments)
          this.props.global.setLoading('Loading comments from Pushshift...')
      })

    this.getComments(this.props.global.state.maxComments, 0)
  }

  componentDidUpdate () {
    const newCommentCount = this.props.global.state.maxComments - this.curMaxComments
    if (newCommentCount > 0) {
      this.curMaxComments = this.props.global.state.maxComments
      this.setState({reloadingComments: true})
      this.props.global.setLoading('Loading more comments from Pushshift...')
      this.getComments(newCommentCount, this.lastCreatedUtc - 1)
    }
  }

  getComments (newCommentCount, after) {
    const { threadID } = this.props.match.params
    const pushshiftCommentLookup = this.state.pushshiftCommentLookup

    // Get comment ids from pushshift
    getPushshiftComments(pushshiftCommentLookup, threadID, newCommentCount, after)
      .then(([lastCreatedUtc, loadedAllComments]) => {
        console.log(`Pushshift: ${pushshiftCommentLookup.size} comments`)
        const ids = []
        const missingIds = new Set()
        this.lastCreatedUtc = lastCreatedUtc

        // Extract ids from pushshift response
        pushshiftCommentLookup.forEach(comment => {
          ids.push(comment.id)
          if (comment.parent_id != threadID &&
              !pushshiftCommentLookup.has(comment.parent_id) &&
              !missingIds.has(comment.parent_id)) {
            ids.push(comment.parent_id)
            missingIds.add(comment.parent_id)
          }
        });
        missingIds.clear()

        // Get all the comments from reddit
        this.props.global.setLoading('Comparing comments to Reddit API...')
        return getRedditComments(ids)
          .then(redditComments => {
            console.log(`Reddit: ${redditComments.length} comments`)
            const removed = []
            const deleted = []

            redditComments.forEach(comment => {
              let pushshiftComment = pushshiftCommentLookup.get(comment.id)
              if (pushshiftComment === undefined) {
                // When a parent comment is missing from pushshift, use the reddit comment instead
                comment.parent_id = comment.parent_id.substring(3)
                comment.link_id = comment.link_id.substring(3)
                pushshiftComment = comment
                pushshiftCommentLookup.set(comment.id, pushshiftComment)
              } else {
                // Replace pushshift score with reddit (it's usually more accurate)
                pushshiftComment.score = comment.score
              }

              // Check what is removed / deleted according to reddit
              if (isRemoved(comment.body)) {
                removed.push(comment.id)
                pushshiftComment.removed = true
              } else if (isDeleted(comment.body)) {
                deleted.push(comment.id)
                pushshiftComment.deleted = true
              } else if (pushshiftComment !== comment) {
                if (isRemoved(pushshiftComment.body)) {
                  // If it's deleted in pushshift, but later restored by a mod, use the restored
                  comment.parent_id = comment.parent_id.substring(3)
                  comment.link_id = comment.link_id.substring(3)
                  pushshiftCommentLookup.set(comment.id, comment)
                } else if (pushshiftComment.body != comment.body) {
                  pushshiftComment.edited_body = comment.body
                  pushshiftComment.edited = comment.edited
                }
              }
            })

            this.props.global.setSuccess()
            this.setState({
              pushshiftCommentLookup,
              removed,
              deleted,
              loadedAllComments,
              loadingComments: false,
              reloadingComments: false
            })
          })
          .catch(e => {
            if (e.origError.name == 'TypeError') {  // The exception when blocked by Tracking Protection
              // https://stackoverflow.com/a/9851769
              const isFirefox = typeof InstallTrigger !== 'undefined'
              if (isFirefox) {
                this.props.global.setError(e, '/about#firefox')
                return
              } else {
                const isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime)
                const isEdgeChromium = isChrome && (navigator.userAgent.indexOf("Edg") != -1)
                if (isEdgeChromium) {
                  this.props.global.setError(e, '/about#edge')
                  return
                }
              }
            }
            throw e
          })
      })
      .catch(this.props.global.setError)
  }

  render () {
    const { subreddit, id, author } = this.state.post
    const { commentID } = this.props.match.params
    const linkToRestOfComments = `/r/${subreddit}/comments/${id}/_/`

    const isSingleComment = commentID !== undefined
    const root = isSingleComment ? commentID : id

    return (
      <>
        <Post {...this.state.post} />
        {
          (!this.state.loadingComments && root) &&
          <>
            <CommentInfo
              total={this.state.pushshiftCommentLookup.size}
              removed={this.state.removed.length}
              deleted={this.state.deleted.length}
            />
            <SortBy
              reloadingComments={this.state.reloadingComments}
            />
            {isSingleComment &&
              <div className='view-rest-of-comment'>
                <div>you are viewing a single comment's thread.</div>
                <Link to={linkToRestOfComments}>view the rest of the comments</Link>
              </div>
            }
            <CommentSection
              root={root}
              comments={this.state.pushshiftCommentLookup}
              removed={this.state.removed}
              deleted={this.state.deleted}
              postAuthor={isDeleted(author) ? null : author}
              commentFilter={this.props.global.state.commentFilter}  // need to explicitly
              commentSort={this.props.global.state.commentSort}      // pass in these props
              reloadingComments={this.state.reloadingComments}       // to ensure React.memo
              total={this.state.pushshiftCommentLookup.size}         // works correctly
            />
            <LoadMore
              loadedAllComments={this.state.loadedAllComments}
              reloadingComments={this.state.reloadingComments}
            />
          </>
        }
      </>
    )
  }
}

export default connect(Thread)
