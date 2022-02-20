import React from 'react'
import Comment from './Comment'
import {connect, sort, filter, maxCommentsDefault} from '../../state'
import {
  topSort, bottomSort, newSort, oldSort,
  showRemovedAndDeleted, showRemoved, showDeleted
} from '../../utils'

const unflatten = (commentMap, root, removed, deleted) => {
  const commentTree = []

  commentMap.forEach(comment => {
    comment.replies = []
  })

  commentMap.forEach(comment => {
    const parentID = comment.parent_id
    let parentComment

    if (parentID === root) {
      commentTree.push(comment)
    } else if ((parentComment = commentMap.get(parentID)) !== undefined) {
      parentComment.replies.push(comment)
    } else {
      console.error('MISSING PARENT ID:', parentID, 'for comment', comment)
    }
  })

  let rootComment
  if ((rootComment = commentMap.get(root)) !== undefined) {
    rootComment.replies = commentTree
    return [rootComment]
  }

  return commentTree
}

const sortCommentTree = (comments, sortFunction) => {
  comments.sort(sortFunction)

  comments.forEach(comment => {
    if (comment.replies.length > 0) {
      sortCommentTree(comment.replies, sortFunction)
    }
  })
}

const filterCommentTree = (comments, filterFunction) => {
  if (comments.length === 0) {
    return false
  }

  let hasOkComment = false

  // Reverse for loop since we are removing stuff
  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i]
    const isRepliesOk = filterCommentTree(comment.replies, filterFunction)
    const isCommentOk = filterFunction(comment)

    if (!isRepliesOk && !isCommentOk) {
      comments.splice(i, 1)
    } else {
      hasOkComment = true
    }
  }

  return hasOkComment
}

const commentSection = (props) => {
  console.time('render comment section')
  const commentTree = unflatten(props.comments, props.root, props.removed, props.deleted)
  const {commentFilter, commentSort} = props.global.state
  const maxCommentsPreferred = props.global.getMaxComments()

  if (commentFilter === filter.removedDeleted) {
    filterCommentTree(commentTree, showRemovedAndDeleted)
  } else if (commentFilter === filter.removed) {
    filterCommentTree(commentTree, showRemoved)
  } else if (commentFilter === filter.deleted) {
    filterCommentTree(commentTree, showDeleted)
  }

  if (commentSort === sort.top) {
    sortCommentTree(commentTree, topSort)
  } else if (commentSort === sort.bottom) {
    sortCommentTree(commentTree, bottomSort)
  } else if (commentSort === sort.new) {
    sortCommentTree(commentTree, newSort)
  } else if (commentSort === sort.old) {
    sortCommentTree(commentTree, oldSort)
  }
  console.timeEnd('render comment section')

  return (
    commentTree.length !== 0
      ? <> {commentTree.map(comment => (
        <Comment
          key={comment.id}
          {...comment}
          depth={0}
          postAuthor={props.postAuthor}
        />
      ))}
      <p className='load-more'>
        {maxCommentsPreferred <= maxCommentsDefault / 2 &&
          <a onClick={() => props.global.loadMoreComments(maxCommentsPreferred)}>load {maxCommentsPreferred} more comments</a>
        }
        <a onClick={() => props.global.loadMoreComments(maxCommentsDefault)}>load {maxCommentsDefault} more comments</a>
        {maxCommentsPreferred >= maxCommentsDefault * 2 &&
          <a onClick={() => props.global.loadMoreComments(maxCommentsPreferred)}>load {maxCommentsPreferred} more comments</a>
        }
      </p>
      </>
      : <p>No comments found</p>
  )
}

export default connect(commentSection)
