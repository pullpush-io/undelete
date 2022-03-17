import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { prettyScore, prettyDate, prettyTimeDiff, exactDateTime, parse, redditThumbnails, isDeleted, isRemoved } from '../../utils'

export default (props) => {
  if (!props.title) {
    return <div />
  }

  const url = props.url.replace('https://www.reddit.com', '')
  const userLink = isDeleted(props.author) ? undefined : `https://www.reddit.com/user/${props.author}`

  let thumbnail
  const thumbnailWidth = props.thumbnail_width ? props.thumbnail_width * 0.5 : 70
  const thumbnailHeight = props.thumbnail_height ? props.thumbnail_height * 0.5 : 70

  if (redditThumbnails.includes(props.thumbnail)) {
    thumbnail = <a href={url} className={`thumbnail thumbnail-${props.thumbnail}`} />
  } else if (props.thumbnail !== '') {
    thumbnail = (
      <a href={url}>
        <img className='thumbnail' src={props.thumbnail} width={thumbnailWidth} height={thumbnailHeight} alt='Thumbnail' />
      </a>
    )
  }

  let innerHTML, editedInnerHTML;
  if (isRemoved(props.selftext) && props.removed) {
    if (!props.hasOwnProperty('retrieved_utc') && !props.hasOwnProperty('retrieved_on') || !props.hasOwnProperty('created_utc')) {
      innerHTML = '<p>[removed too quickly to be archived]</p>'
    } else {
      const retrieved = props.hasOwnProperty('retrieved_utc') ? props.retrieved_utc : props.retrieved_on;
      innerHTML = `<p>[removed within ${prettyTimeDiff(retrieved - props.created_utc)}]</p>`
    }
  } else if (props.selftext) {
    innerHTML = parse(props.selftext)
    if (props.hasOwnProperty('edited_selftext'))
      editedInnerHTML = parse(props.edited_selftext)
  }

  const [showEdited, setShowEdited] = useState(false)

  return (
    <div className={`thread ${props.removed && 'removed'} ${props.deleted && 'deleted'}`}>
      {props.position &&
        <span className='post-rank'>{props.position}</span>}
      <div className='thread-score-box'>
        <div className='vote upvote' />
        <div className='thread-score'>{prettyScore(props.score)}</div>
        <div className='vote downvote' />
      </div>
      {thumbnail}
      <div className='thread-content'>
        <a className='thread-title' href={url}>{props.title}</a>
        {
          props.link_flair_text &&
          <span className='link-flair'>{props.link_flair_text}</span>
        }
        <span className='domain'>({props.domain})</span>
        <div className='thread-info'>
          submitted <span className='thread-time' title={exactDateTime(props.created_utc)}>{prettyDate(props.created_utc)}</span>
          {props.edited &&
            <span className='thread-time' title={exactDateTime(props.edited)}> * (last edited {prettyDate(props.edited)})</span>}
          &nbsp;by <a className='thread-author author' href={userLink}>{props.author}</a> to /r/{props.subreddit}
        </div>
        {innerHTML !== undefined &&
          <div className='thread-selftext user-text' dangerouslySetInnerHTML={{ __html: showEdited ? editedInnerHTML : innerHTML }} />}
        <div className='total-comments'>
          <Link to={props.permalink}>{props.num_comments} comments</Link>&nbsp;
          <a href={`https://www.reddit.com${props.permalink}`}>reddit</a>&nbsp;
          <a href={`https://reveddit.com${props.permalink}`}>reveddit</a>
          {props.hasOwnProperty('edited_selftext') &&
            <a onClick=  {() => setShowEdited(!showEdited)}
               onKeyDown={e => e.key == "Enter" && setShowEdited(!showEdited)}
               tabIndex= {0}
               title=    {showEdited ? 'The most recent version is shown; click to show the earliest archived' : 'The earliest archived version is shown; click to show the most recent'}
            >*edited</a>}
        </div>
      </div>
    </div>
  )
}
