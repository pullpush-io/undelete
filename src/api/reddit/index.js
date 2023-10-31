import { getAuth } from './auth'
import { fetchJsonAndHeaders, sleep } from '../../utils'

export const chunkSize = 100;
const baseURL = 'https://oauth.reddit.com'

let limitDefault = 300
let limitRemaining = limitDefault, limitResetAtMS = 0

// Fetch JSON results from the Reddit API, respecting the reported API limits
const fetchJson = async url => {
  const init = await getAuth()

  if (limitRemaining <= 0) {
    const waitMS = limitResetAtMS - Date.now() + 1000
    if (waitMS > 0) {
      // TODO: update the UI to notify user of a delay
      console.log(`Waiting ${waitMS}ms for Reddit API`)
      await sleep(waitMS)
    }
    if (limitRemaining <= 0)
      limitRemaining = limitDefault
  }

  limitRemaining--
  init.headers['Accept-Language'] = 'en'
  const response = await fetchJsonAndHeaders(url, init)
  const headers = response.headers

  const reportedLimitRemaining = parseInt(headers.get('X-Ratelimit-Remaining'))
  const reportedLimitDefault = reportedLimitRemaining + parseInt(headers.get('X-Ratelimit-Used'))
  if (reportedLimitDefault && reportedLimitDefault != limitDefault) {
    // This should only happen if Reddit changes the API limits
    console.warn('Correcting limitDefault from', limitDefault, 'to', reportedLimitDefault)
    limitDefault = reportedLimitDefault
  }

  const reportedLimitResetAtMS = parseInt(headers.get('X-Ratelimit-Reset')) * 1000 + Date.now()
  if (reportedLimitResetAtMS > limitResetAtMS + 30000) {
    // This happens each time the Reddit API resets our limit
    console.debug('Resetting limitResetAtMS from', limitResetAtMS, 'to', reportedLimitResetAtMS)
    limitResetAtMS = reportedLimitResetAtMS
  } else {
    if (reportedLimitResetAtMS < limitResetAtMS) {
      // This happens sporadically due to jitter
      console.debug('Decreasing limitResetAtMS from', limitResetAtMS, 'to', reportedLimitResetAtMS)
      limitResetAtMS = reportedLimitResetAtMS
    }
    if (reportedLimitRemaining < limitRemaining) {
      // This probably shouldn't happen unless Reddit decreases the API limits
      console.warn('Decreasing limitRemaining from', limitRemaining, 'to', reportedLimitRemaining)
      limitRemaining = reportedLimitRemaining
    }
  }
  return response.json
}

const errorHandler = (origError, from) => {
  console.error(from + ': ' + origError)
  const error = new Error('Could not connect to Reddit')
  error.origError = origError
  if (origError.name == 'TypeError') {  // The exception when blocked by Tracking Protection
    // https://stackoverflow.com/a/9851769
    const isFirefox = typeof InstallTrigger !== 'undefined'
    if (isFirefox)
      error.helpUrl = '/about#firefox'
    else {
      const isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime)
      const isEdgeChromium = isChrome && (navigator.userAgent.indexOf("Edg") != -1)
      if (isEdgeChromium)
        error.helpUrl = '/about#edge'
    }
  }
  throw error
}

// Return the post itself
export const getPost = threadID => (
  fetchJson(`${baseURL}/comments/${threadID}.json?limit=1`)
    .then(thread => thread[0].data.children[0].data)
    .catch(error => errorHandler(error, 'reddit.getPost'))
)

//// Fetch multiple threads (via the info endpoint)
export const getThreads = threadIDs => {
  console.log(threadIDs)
  return (
 fetchJson(`${baseURL}/api/info?id=${threadIDs.map(id => `t3_${id}`).join()}`)
   .then(response => response.data.children.map(threadData => threadData.data))
   .catch(error => errorHandler(error, 'reddit.getThreads'))
)}

// Fetch multiple comments by id
export const getComments = commentIDs => (
  fetchJson(`${baseURL}/api/info?id=${commentIDs.map(id => `t1_${id}`).join()}`)
    .then(results => results.data.children.map(({data}) => data))
    .catch(error => errorHandler(error, 'reddit.getComments'))
)

// Fetch up to 8 of a comment's parents
export const getParentComments = (threadID, commentID, parents) => {
  parents = Math.min(parents, 8)
  return fetchJson(
      `${baseURL}/comments/${threadID}?comment=${commentID}&context=${parents}&limit=${parents}&threaded=false&showmore=false`
    )
    .then(results => {
      const { children } = results[1].data
      // If there are fewer parents than requested, remove the comments which aren't parents
      const idx = children.findIndex(c => c.data.id == commentID)
      if (idx >= 0)
        children.splice(idx)
      return children.map(({data}) => data)
    })
    .catch(error => errorHandler(error, 'reddit.getParentComments'))
}
