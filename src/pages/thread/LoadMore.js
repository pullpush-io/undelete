import React from 'react'
import {connect, getMaxComments, maxCommentsDefault} from '../../state'

const loadMore = (props) => {
  const maxCommentsPreferred = getMaxComments()

  if (props.reloadingComments)
    return <p className='loading-more'><span>loading...</span></p>
  else if (props.loadedAllComments)
    return <p className='load-more'>
      <a onClick={() => props.global.loadMoreComments(maxCommentsDefault)}>load new comments</a>
    </p>
  else
    return <p className='load-more'>
      {maxCommentsPreferred <= maxCommentsDefault / 2 &&
        <a onClick={() => props.global.loadMoreComments(maxCommentsPreferred)}>load {maxCommentsPreferred} more comments</a>
      }
      <a onClick={() => props.global.loadMoreComments(maxCommentsDefault)}>load {maxCommentsDefault} more comments</a>
      {maxCommentsPreferred >= maxCommentsDefault * 2 &&
        <a onClick={() => props.global.loadMoreComments(maxCommentsPreferred)}>load {maxCommentsPreferred} more comments</a>
      }
    </p>
}

export default connect(loadMore)
