import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { prettyScore, prettyDate, prettyTimeDiff, exactDateTime, parse, redditThumbnails, isDeleted, isRemoved } from '../../utils'

export default (props) => {
  if (!props.title) {
    const permalink = `/r/${props.subreddit}/comments/${props.id}/`
    return <div className={props.removed ? 'thread removed' : 'thread'} key={props.removed ? 'post-removed' : 'post-empty'}>
      <div className="thread-score-box">
        <div className="vote upvote" />
        <div className="thread-score">?</div>
        <div className="vote downvote" />
      </div>
      <Link className="thumbnail thumbnail-default" to={permalink} replace={props.isLocFullPost} />
      <div className="thread-content">
        <Link className="thread-title" to={permalink} replace={props.isLocFullPost}>
          {props.removed ? '[removed too quickly to be archived]' : '...'}
        </Link>
        <div className='thread-info'>&nbsp;</div>
        <div className="total-comments">
          <a href={`https://www.reddit.com${permalink}`}>reddit</a>&nbsp;
          <a href={`https://www.reveddit.com${permalink}`}>reveddit</a>
        </div>
      </div>
    </div>
  }

  let url = new URL(props.url, 'https://www.reddit.com')
  if ((url.hostname.endsWith('.reddit.com') || url.hostname == 'reddit.com') &&
       url.pathname.match(/^\/(?:r|user)\/[^/]+\/comments\/./)) {
    url.protocol = document.location.protocol
    url.host     = document.location.host
  }
  const isUrlThisPost = url.origin == document.location.origin &&
    (new RegExp(`/(?:r|user)/[^/]+/comments/${props.id}\\b`)).test(url.pathname)
  if (isUrlThisPost)
    url = url.href.substring(url.origin.length)

  const userLink = isDeleted(props.author) ? undefined : `https://www.reddit.com/user/${props.author}`

  let thumbnail
  const thumbnailWidth = props.thumbnail_width ? props.thumbnail_width * 0.5 : 70
  const thumbnailHeight = props.thumbnail_height ? props.thumbnail_height * 0.5 : 70

  if (redditThumbnails.includes(props.thumbnail)) {
    thumbnail = React.createElement(isUrlThisPost ? Link : 'a', {
      [isUrlThisPost ? 'to' : 'href']: url,
      replace: isUrlThisPost ? props.isLocFullPost : undefined,
      className: `thumbnail thumbnail-${props.thumbnail}`
    })
  } else if (props.thumbnail !== '') {
    thumbnail = React.createElement(isUrlThisPost ? Link : 'a', {
      [isUrlThisPost ? 'to' : 'href']: url,
      replace: isUrlThisPost ? props.isLocFullPost : undefined
    }, <img className='thumbnail' src={props.thumbnail} width={thumbnailWidth} height={thumbnailHeight} alt='Thumbnail' />)
  }

  let innerHTML, editedInnerHTML;
  if (props.removed && isRemoved(props.selftext)) {
    if (!props.hasOwnProperty('retrieved_utc') && !props.hasOwnProperty('retrieved_on') || !props.hasOwnProperty('created_utc')) {
      innerHTML = '<p>[removed too quickly to be archived]</p>'
    } else {
      const retrieved = props.hasOwnProperty('retrieved_utc') ? props.retrieved_utc : props.retrieved_on;
      innerHTML = `<p>[removed within ${prettyTimeDiff(retrieved - props.created_utc)}]</p>`
    }
  } else if (props.selftext && (props.is_self || !isDeleted(props.selftext))) {
    innerHTML = parse(props.selftext)
    if (props.hasOwnProperty('edited_selftext'))
      editedInnerHTML = parse(props.edited_selftext)
  }

  const [showEdited, setShowEdited] = useState(false)

  const totalComments = <div className='total-comments'>
    <Link to={props.permalink} replace={props.isLocFullPost}>{props.num_comments}&nbsp;comments</Link>&nbsp;
    <a href={`https://www.reddit.com${props.permalink}`}>reddit</a>&nbsp;
    <a href={`https://www.reveddit.com${props.permalink}`}>reveddit</a>
    {props.hasOwnProperty('edited_selftext') &&
      <a onClick=  {() => setShowEdited(!showEdited)}
         onKeyDown={e => e.key == 'Enter' && setShowEdited(!showEdited)}
         tabIndex= {0}
         title=    {showEdited ? 'The most recent version is shown; click to show the earliest archived' : 'The earliest archived version is shown; click to show the most recent'}
      >*edited</a>}
  </div>

  return <div className={props.removed ? 'removed' : props.deleted ? 'deleted' : undefined} key="post-found">
    <div className='thread'>
      {props.position &&
        <span className='post-rank'>{props.position}</span>}
      <div className='thread-score-box'>
        <div className='vote upvote' />
        <div className='thread-score'>{prettyScore(props.score)}</div>
        <div className='vote downvote' />
      </div>
      {thumbnail}
      <div className='thread-content'>
        { React.createElement(isUrlThisPost ? Link : 'a', {
          [isUrlThisPost ? 'to' : 'href']: url,
          replace: isUrlThisPost ? props.isLocFullPost : undefined,
          className:'thread-title'
        }, props.title) }
        {props.link_flair_text &&
          <span className='link-flair'>{props.link_flair_text}</span>
        }
        <span className='domain'>({props.domain})</span>
        <div className='thread-info'>
          submitted <span className='thread-time' title={exactDateTime(props.created_utc)}>{prettyDate(props.created_utc)}</span>
          {props.edited &&
            <span className='thread-time' title={exactDateTime(props.edited)}> * (last edited {prettyDate(props.edited)})</span>
          }
          &nbsp;by <a className='thread-author author' href={userLink}>{props.author}</a> to /r/{props.subreddit}
        </div>
        {innerHTML === undefined && totalComments}
      </div>
    </div>
    {innerHTML !== undefined &&
      <div className='thread-content'>
        <div className='thread-selftext user-text' dangerouslySetInnerHTML={{ __html: showEdited ? editedInnerHTML : innerHTML }} />
        {totalComments}
      </div>
    }
  </div>
}
