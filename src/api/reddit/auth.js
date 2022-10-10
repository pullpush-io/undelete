import { fetchJson } from '../../utils'

// Change this to your own client ID: https://www.reddit.com/prefs/apps
// The app NEEDS TO BE an installed app and NOT a web app

const clientID = 'NAhiRYXXEFeIXyFazmhGHQ'

// Token for reddit API
let token, tokenExpiresMS = 0, tokenPromise

// TODO: respect login API limits?
const getToken = async () => {
  // We have already gotten a token
  if (token && tokenExpiresMS > Date.now())
    return token

  // We are already waiting to get a token
  if (tokenPromise)
    return (await tokenPromise).access_token

  // Headers for getting reddit api token
  const tokenInit = {
    headers: {
      Authorization: `Basic ${window.btoa(`${clientID}:`)}`,
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
    },
    method: 'POST',
    body: `grant_type=${encodeURIComponent('https://oauth.reddit.com/grants/installed_client')}&device_id=DO_NOT_TRACK_THIS_DEVICE`
  }

  tokenPromise = fetchJson('https://www.reddit.com/api/v1/access_token', tokenInit)
  try {
    const response = await tokenPromise
    tokenExpiresMS = Date.now() + 1000*( parseInt(response.expires_in) - 10 )
    token = response.access_token
  } catch (error) {
      console.error('reddit.getToken ->')
      throw error
  } finally {
    tokenPromise = undefined
  }
  return token
}

// Get header for general api calls
export const getAuth = () => {
  return getToken()
    .then(token => ({
      headers: {
        Authorization: `bearer ${token}`
      }
    }))
}
