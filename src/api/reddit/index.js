import { fetchJson, chunk } from '../../utils'
import { getAuth } from './auth'

const errorHandler = (error, from) => {
  console.error(from + ': ' + error)
  throw new Error('Could not connect to Reddit')
}

// Return the post itself
export const getPost = (subreddit, threadID) => (
  getAuth()
    .then(auth => fetchJson(`https://oauth.reddit.com/comments/${threadID}.json?limit=1`, auth))
    .then(thread => thread[0].data.children[0].data)
    .catch(error => errorHandler(error, 'reddit.getPost'))
)

//// Fetch multiple threads (via the info endpoint)
//export const getThreads = threadIDs => {
//  return getAuth()
//    .then(auth => fetchJson(`https://oauth.reddit.com/api/info?id=${threadIDs.map(id => `t3_${id}`).join()}`, auth))
//    .then(response => response.data.children.map(threadData => threadData.data))
//    .catch(error => errorHandler(error, 'reddit.getThreads'))
//}

// Helper function that fetches a list of comments
const fetchComments = (commentIDs, auth) => {
  return fetchJson(`https://oauth.reddit.com/api/info?id=${commentIDs.map(id => `t1_${id}`).join()}`, auth)
    .then(results => results.data.children.map(({data}) => data))
}

export const getComments = commentIDs => {
  return getAuth()
    .then(auth => (
      Promise.all(chunk(commentIDs, 100)
        .map(ids => fetchComments(ids, auth)))
        .then(results => results.flat())
    ))
    .catch(error => errorHandler(error, 'reddit.getComments'))
}
