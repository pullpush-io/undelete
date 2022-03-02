import { fetchJson } from '../../utils'

export const chunkSize = 100;
const postURL    = 'https://api.pushshift.io/reddit/submission/search/?ids='
const commentURL = `https://api.pushshift.io/reddit/comment/search/?size=${chunkSize}&sort=asc&fields=author,body,created_utc,id,link_id,parent_id,retrieved_on,retrieved_utc,score,subreddit&q=*&link_id=`

const sleep = ms =>
  new Promise(slept => setTimeout(slept, ms))

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
    console.error('pushshift.getPost: ' + error)
    throw new Error('Could not get removed post')
  }
}

export const getComments = async (allComments, threadID, maxComments, after) => {
  let chunks = Math.ceil(maxComments / chunkSize), comments, lastCreatedUtc = 1
  while (true) {

    let delay = 0
    while (true) {
      await pushshiftTokenBucket.waitForToken()
      try {
        comments = (await fetchJson(`${commentURL}${threadID}&after=${after}`)).data
        break
      } catch (error) {
        if (delay >= 8000) {  // after ~16s of consecutive failures
          console.error('pushshift.getComments: ' + error)
          throw new Error('Could not get removed comments')
        }
        delay = delay * 2 || 125
        console.log('pushshift.getComments delay: ' + delay)
        pushshiftTokenBucket.setNextAvail(delay)
      }
    }

    comments.forEach(c => allComments.set(c.id, {
      ...c,
      parent_id: c.parent_id?.substring(3) || threadID,
      link_id:   c.link_id?.substring(3)   || threadID
    }))
    if (comments.length)
      lastCreatedUtc = comments[comments.length - 1].created_utc
    if (comments.length < chunkSize/2)
      return [ lastCreatedUtc, true ]
    if (chunks <= 1)
      return [ lastCreatedUtc, false ]
    chunks--
    after = Math.max(lastCreatedUtc - 1, after + 1)
  }
}
