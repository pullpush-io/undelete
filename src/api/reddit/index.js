import { fetchJson } from '../../utils'

export const chunkSize = 100;
const baseURL = 'https://api.reddit.com'
const requestSettings = {headers: {"Accept-Language": "en"}}

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
  fetchJson(`${baseURL}/comments/${threadID}.json?limit=1`, requestSettings)
    .then(thread => thread[0].data.children[0].data)
    .catch(error => errorHandler(error, 'reddit.getPost'))
)

//// Fetch multiple threads (via the info endpoint)
//export const getThreads = threadIDs => (
//  fetchJson(`${baseURL}/api/info?id=${threadIDs.map(id => `t3_${id}`).join()}`)
//    .then(response => response.data.children.map(threadData => threadData.data))
//    .catch(error => errorHandler(error, 'reddit.getThreads'))
//)

// Fetch multiple comments by id
export const getComments = commentIDs => (
  fetchJson(`${baseURL}/api/info?id=${commentIDs.map(id => `t1_${id}`).join()}`, requestSettings)
    .then(results => results.data.children.map(({data}) => data))
    .catch(error => errorHandler(error, 'reddit.getComments'))
)
