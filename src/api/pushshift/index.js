import { fetchJson } from '../../utils'

const chunkSize = 100;
const postURL    = 'https://api.pushshift.io/reddit/submission/search/?ids='
const commentURL = `https://api.pushshift.io/reddit/comment/search/?size=${chunkSize}&sort=asc&fields=author,body,created_utc,id,link_id,parent_id,retrieved_on,retrieved_utc,score,subreddit&q=*&link_id=`

const sleep = ms =>
  new Promise(slept => setTimeout(slept, ms))

export const getPost = async threadID => {
  try {
    return (await fetchJson(`${postURL}${threadID}`)).data[0]
  } catch (error) {
    console.error('pushshift.getPost: ' + error)
    throw new Error('Could not get removed post')
  }
}

export const getComments = async (threadID, maxComments) => {
  let chunks = Math.ceil(maxComments / chunkSize)
  let after = 0, delay = 0, comments
  const allComments = new Map()
  while (true) {

    while (true) {
      try {
        comments = (await fetchJson(`${commentURL}${threadID}&after=${after}`)).data
        break
      } catch (error) {
        if (delay > 4000) {
          console.error('pushshift.getComments: ' + error)
          throw new Error('Could not get removed comments')
        }
        delay = delay * 2 || 500
      }
      await sleep(delay)
    }

    comments.forEach(c => allComments.set(c.id, {
      ...c,
      parent_id: c.parent_id?.substring(3) || threadID,
      link_id:   c.link_id?.substring(3)   || threadID
    }))
    if (comments.length < chunkSize/2 || chunks <= 1)
      break
    chunks -= 1
    after = Math.max(comments[comments.length - 1].created_utc - 1, after + 1)
    if (delay)
      await sleep(delay)
  }
  return allComments
}
