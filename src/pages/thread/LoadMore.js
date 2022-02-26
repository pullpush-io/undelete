import React from 'react'
import {connect, getMaxComments, maxCommentsDefault} from '../../state'

let lastTotal
const loadMoreComments = (props, maxComments) => {
  lastTotal = props.total
  props.global.loadMoreComments(maxComments)
}

const loadMore = (props) => {
  const maxCommentsPreferred = getMaxComments()
  let loadElements

  if (props.reloadingComments)
    loadElements = [<span key='loading'>loading...</span>]
  else {
    if (props.loadedAllComments)
      loadElements = [<a key='default' onClick={() => loadMoreComments(props, maxCommentsDefault)}>load new comments</a>]
    else {
      loadElements = []
      if (maxCommentsPreferred <= maxCommentsDefault / 2)
        loadElements.push(<a key='pref' onClick={() => loadMoreComments(props, maxCommentsPreferred)}>load {maxCommentsPreferred} more comments</a>)
      loadElements.push(<a key='default' onClick={() => loadMoreComments(props, maxCommentsDefault)}>load {maxCommentsDefault} more comments</a>)
      if (maxCommentsPreferred >= maxCommentsDefault * 2)
        loadElements.push(<a key='pref' onClick={() => loadMoreComments(props, maxCommentsPreferred)}>load {maxCommentsPreferred} more comments</a>)
    }
    if (lastTotal !== undefined) {
      const newComments = props.total - lastTotal
      loadElements.push(<span key='loaded' className='fade'>
        {newComments > 0 ? `loaded ${newComments} more comments` : 'no new comments found'}
      </span>)
    }
  }
  return <p className='load-more'>{loadElements}</p>
}

export default connect(loadMore)
