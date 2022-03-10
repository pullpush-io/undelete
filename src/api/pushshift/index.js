import { fetchJson, sleep } from '../../utils'

export const chunkSize = 100;
const postURL    = 'https://api.pushshift.io/reddit/submission/search/?ids='
const commentURL = `https://api.pushshift.io/reddit/comment/search/?metadata=true&size=${chunkSize}&sort=asc&fields=author,body,created_utc,id,link_id,parent_id,retrieved_on,retrieved_utc,score,subreddit&q=*&link_id=`

const errorHandler = (msg, origError, from) => {
  console.error(from + ': ' + origError)
  const error = new Error(msg)
  if (origError.name == 'TypeError')  // Usually indicates that Pushshift is down
    error.helpUrl = '/about#psdown'
  throw error
}

class TokenBucket {

  // Refills tokens at a rate of one per msRefillIntvl millis, storing up to size tokens.
  constructor(msRefillIntvl, size) {
    if (!(msRefillIntvl > 0))
      throw RangeError('msRefillIntvl must be > 0')
    if (!(size > 0))
      throw RangeError('size must be > 0')
    this._msRefillIntvl = msRefillIntvl
    this._maxSize = size
    this._tokens  = size
    // Invariant: this._msNextRefill is valid iff this._tokens < this._maxSize
  }

  // Removes one token, waiting for it to refill if none are available.
  async waitForToken() {
    let msNow
    // Calculate if/how many tokens to refill
    if (this._tokens < this._maxSize) {  // this._msNextRefill is valid
      msNow = Date.now()
      if (msNow >= this._msNextRefill) {
        const newTokens = Math.floor((msNow - this._msNextRefill) / this._msRefillIntvl) + 1
        this._tokens += newTokens
        if (this._tokens < this._maxSize)
          this._msNextRefill += newTokens * this._msRefillIntvl
        else
          this._tokens = this._maxSize  // this._msNextRefill is now invalid
      }
    }
    // Remove a token or wait for _msNextRefill, and recalculate it
    if (this._tokens > 0) {
      if (this._tokens == this._maxSize)                  // this._msNextRefill is invalid,
        this._msNextRefill = (msNow || Date.now()) + this._msRefillIntvl  // make it valid
      this._tokens--
    } else {  // this._msNextRefill is valid and msNow has already been set above
      await sleep(this._msNextRefill - msNow)
      this._msNextRefill += this._msRefillIntvl
    }
  }

  // Removes all tokens, and will refill the next token msNextAvail
  // millis from now. After it's refilled, resumes normal refill rate.
  setNextAvail(msNextAvail) {
    this._tokens = 0
    this._msNextRefill = Date.now() + msNextAvail
  }
}

const pushshiftTokenBucket = new TokenBucket(1015, 7)

export const getPost = async threadID => {
  await pushshiftTokenBucket.waitForToken()
  try {
    return (await fetchJson(`${postURL}${threadID}`)).data[0]
  } catch (error) {
    errorHandler('Could not get removed post', error, 'pushshift.getPost')
  }
}

// The callback() function is called with an Array of comments after each chunk is
// retrieved. It should return as quickly as possible (scheduling time-taking work
// later), and may return false to cause getComments to exit early, or true otherwise.
export const getComments = async (callback, threadID, maxComments, after) => {
  let chunks = Math.floor(maxComments / chunkSize), response, lastCreatedUtc = 1
  while (true) {

    let delay = 0
    while (true) {
      await pushshiftTokenBucket.waitForToken()
      try {
        response = await fetchJson(`${commentURL}${threadID}${after ? `&after=${after}` : ''}`)
        break
      } catch (error) {
        if (delay >= 8000)  // after ~16s of consecutive failures
          errorHandler('Could not get removed comments', error, 'pushshift.getComments')  // rethrows
        delay = delay * 2 || 125
        console.log('pushshift.getComments delay: ' + delay)
        pushshiftTokenBucket.setNextAvail(delay)
      }
    }
    const comments = response.data
    const exitEarly = callback(comments.map(c => ({
      ...c,
      parent_id: c.parent_id?.substring(3) || threadID,
      link_id:   c.link_id?.substring(3)   || threadID
    })))

    const loadedAllComments = response.metadata.results_returned >= response.metadata.total_results
    if (comments.length)
      lastCreatedUtc = comments[comments.length - 1].created_utc
    if (loadedAllComments || chunks <= 1 || exitEarly)
      return [ lastCreatedUtc, loadedAllComments ]
    chunks--
    after = Math.max(lastCreatedUtc - 1, after + 1)
  }
}
