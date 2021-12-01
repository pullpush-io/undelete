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
import { connect } from '../../state'
import Post from '../common/Post'
import CommentSection from './CommentSection'
import SortBy from './SortBy'
import CommentInfo from './CommentInfo'

class Thread extends React.Component {
  state = {
    post: {},
    pushshiftCommentLookup: new Map(),
    removed: [],
    deleted: [],
    loadingComments: true
  }

  componentDidMount () {
    const { subreddit, threadID } = this.props.match.params
    this.props.global.setLoading('Loading post...')

    // Get post from reddit
    getPost(subreddit, threadID)
      .then(post => {
        document.title = post.title
        this.setState({ post })
        // Fetch the post from pushshift if it was deleted/removed
        if (isDeleted(post.selftext) || isRemoved(post.selftext)) {
          getRemovedPost(threadID)
            .then(removedPost => {
              if (isRemoved(post.selftext)) {
                removedPost.removed = true
              } else {
                removedPost.deleted = true
              }
              this.setState({ post: removedPost })
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

    // Get comment ids from pushshift
    getPushshiftComments(threadID, this.props.global.state.maxComments)
      .then(pushshiftComments => {
        console.log(`Pushshift: ${pushshiftComments.length} comments`)
        const pushshiftCommentLookup = new Map(pushshiftComments.map(c => [c.id, c]))
        const ids = []
        const missingIds = new Set()

        // Extract ids from pushshift response
        pushshiftComments.forEach(comment => {
          ids.push(comment.id)
          if (comment.parent_id != threadID &&
              !pushshiftCommentLookup.has(comment.parent_id) &&
              !missingIds.has(comment.parent_id)) {
            ids.push(comment.parent_id)
            missingIds.add(comment.parent_id)
          }
        });
        pushshiftComments = undefined
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
              } else if (pushshiftComment !== comment && isRemoved(pushshiftComment.body)) {
                // If it's deleted in pushshift, but later restored by a mod, use the restored
                comment.parent_id = comment.parent_id.substring(3)
                comment.link_id = comment.link_id.substring(3)
                pushshiftCommentLookup.set(comment.id, comment)
              }
            })

            this.props.global.setSuccess()
            this.setState({
              pushshiftCommentLookup,
              removed,
              deleted,
              loadingComments: false
            })
          })
      })
      .catch(this.props.global.setError)
  }

  render () {
    const { subreddit, id } = this.state.post
    const { commentID } = this.props.match.params
    const linkToRestOfComments = `/r/${subreddit}/comments/${id}/_/`

    const isSingleComment = commentID !== undefined
    const root = isSingleComment ? commentID : id

    return (
      <React.Fragment>
        <Post {...this.state.post} />
        {
          (!this.state.loadingComments && root) &&
          <React.Fragment>
            <CommentInfo
              total={this.state.pushshiftCommentLookup.size}
              removed={this.state.removed.length}
              deleted={this.state.deleted.length}
            />
            <SortBy />
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
            />
          </React.Fragment>
        }
      </React.Fragment>
    )
  }
}

export default connect(Thread)
