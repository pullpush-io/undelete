import React, { useState } from 'react'
import {connect, sort, filter, minCommentsLimit, maxCommentsLimit, constrainMaxComments} from '../../state'

const SortBy = props => {
  // The current value of the field; it'll be later saved after an onBlur event
  const [maxCommentsField, setMaxCommentsField] = useState(props.global.maxComments)
  const isFirefox = typeof InstallTrigger !== 'undefined'
  let usedMouse;

  return (
  <div id='comment-sort'>
  <span className='nowrap'>
    <label htmlFor='commentSort'>sorted by:</label>
    <select id='commentSort' defaultValue={props.global.state.commentSort}
      onMouseDown={() => usedMouse = true}
      onKeyDown=  {() => usedMouse = false}
      onChange=   {e  => {props.global.setCommentSort(e.target.value); if (usedMouse) e.target.blur()}}>
      <option value={sort.top}>top</option>
      <option value={sort.bottom}>bottom</option>
      <option value={sort.new}>new</option>
      <option value={sort.old}>old</option>
    </select>
    <span className='space' />
  </span>
  <span className={props.allCommentsFiltered ? 'nowrap attention' : 'nowrap'}>
    <label htmlFor='commentFilter'>show:</label>
    <select id='commentFilter' defaultValue={props.global.state.commentFilter}
      onMouseDown={() => usedMouse = true}
      onKeyDown=  {() => usedMouse = false}
      onChange=   {e  => {props.global.setCommentFilter(e.target.value); if (usedMouse) e.target.blur()}}>
      <option value={filter.all}>all comments</option>
      <option value={filter.removedDeleted}>removed & deleted</option>
      <option value={filter.removed}>removed</option>
      <option value={filter.deleted}>deleted</option>
    </select>
    <span className='space' />
  </span>
  <span className='nowrap'>
    <label htmlFor='maxComments'>max. to download:</label>
    <span className='space' />
    <input id='maxComments'
      onKeyDown={e => e.key == "Enter" && e.target.blur()}
      onChange= {e => setMaxCommentsField(constrainMaxComments(parseInt(e.target.value)))}
      onBlur=   {e => e.target.value = props.global.setMaxComments(e.target.value)}
      { ...(isFirefox ? {
        onClick: e => e.target.focus() } : {}) }
      defaultValue={props.global.maxComments} type='number' maxLength='5' required
      min={minCommentsLimit} max={maxCommentsLimit} step={minCommentsLimit} />
  </span>
  { !props.reloadingComments && !props.loadedAllComments && !props.global.isErrored() &&
    maxCommentsField > props.global.maxComments && maxCommentsField - minCommentsLimit >= props.total &&
  <span className='nowrap'>
    <span className='space' />
    <input onClick={() => props.global.loadMoreComments(props.global.maxComments - props.total)} type='button' value='Reload' />
  </span> }
  </div>
  )
}

export default connect(SortBy)
