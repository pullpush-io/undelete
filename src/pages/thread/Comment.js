import React from 'react'
import { Link } from 'react-router-dom'
import { prettyScore, prettyDate, prettyTimeDiff, parse, isRemoved } from '../../utils'

const Comment = (props) => {
  let commentStyle = 'comment '

  if (props.removed) {
    commentStyle += 'removed'
  } else if (props.deleted) {
    commentStyle += 'deleted'
  } else {
    commentStyle += props.depth % 2 === 0 ? 'comment-even' : 'comment-odd'
  }

  let innerHTML;
  if (isRemoved(props.body) && props.removed) {
    if (!props.hasOwnProperty('retrieved_utc') && !props.hasOwnProperty('retrieved_on') || !props.hasOwnProperty('created_utc')) {
      innerHTML = '<p>[removed too quickly to be archived]</p>'
    } else if (props.created_utc < 1627776000) {  // Aug 1 2021
      const retrieved = props.hasOwnProperty('retrieved_utc') ? props.retrieved_utc : props.retrieved_on;
      innerHTML = `<p>[removed within ${prettyTimeDiff(retrieved - props.created_utc)}]</p>`
    }
    // After around Aug 1 2021, Pushshift began updating comments from Reddit after around
    // 24-48 hours, including removing(?) comments that were removed from Reddit. The presence
    // of either retrieved_utc or retrieved_on can currently be used to test for this behaviour.
    else if (props.hasOwnProperty('retrieved_utc')) {
      innerHTML = `<p>[removed within ${prettyTimeDiff(props.retrieved_utc - props.created_utc)}]</p>`
    } else {
      innerHTML = `<p>[either removed too quickly, or <a href='https://www.reddit.com/r/pushshift/comments/pgzdav/the_api_now_appears_to_rewrite_nearly_all/'>removed(?) from archive</a> after ${prettyTimeDiff(props.retrieved_on - props.created_utc)}]</p>`
    }
  } else {
    innerHTML = parse(props.body)
  }

  const permalink = `/r/${props.subreddit}/comments/${props.link_id}/_/${props.id}/`

  return (
    <div id={props.id} className={commentStyle}>
      <div className='comment-head'>
        <a href='#' onClick={() => false} className='author'>[–]</a>
        <span className='space' />
        <a
          href={props.author !== '[deleted]' ? `https://www.reddit.com/user/${props.author}` : undefined}
          className='author comment-author'
        >
          {props.author}
          {props.deleted && ' (deleted by user)'}
        </a>
        <span className='space' />
        <span className='comment-score'>{prettyScore(props.score)} point{(props.score !== 1) && 's'}</span>
        <span className='space' />
        <span className='comment-time'>{prettyDate(props.created_utc)}</span>
      </div>
      <div className='comment-body' dangerouslySetInnerHTML={{ __html: innerHTML }} />
      <div className='comment-links'>
        <Link to={permalink}>permalink</Link>
        <a href={`https://www.reddit.com${permalink}`}>reddit</a>
        <a href={`https://reveddit.com${permalink}`}>reveddit</a>
      </div>
      <div>
        {props.replies.map(comment => (
          <Comment
            key={comment.id}
            {...comment}
            depth={props.depth + 1}
          />
        ))}
      </div>
    </div>
  )
}

export default Comment
