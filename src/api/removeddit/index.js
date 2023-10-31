import { fetchJson } from '../../utils'

/* 'https://unddit.com/api' */
// const baseURL = "http://localhost:3000/api"
const baseURL = "https://api.pullpush.io"

export const getRemovedThreadIDs = (subreddit = '', page=1) => {
  if (subreddit.toLowerCase() === 'all') {
    subreddit = ''
  }
  return fetchJson(`${baseURL}/reddit/search/submission/?subreddit=${subreddit}&page=${page}`)
  .catch(error => {
    console.error('removeddit.getRemovedThreadIDs: ' + error.message)
    throw new Error('Could not get removed threads')
  })
  /* OLD
   return fetchJson(`${baseURL}/threads?subreddit=${subreddit}&page=${page - 1}`, 
   {mode: 'no-cors'})
     .catch(error => {
       console.error('removeddit.getRemovedThreadIDs: ' + error)
       throw new Error('Could not get removed threads')
     })
  } */
}
 

/* type data = {
  approved_at_utc: null | ,
  subreddit : string,
  selftext : string,
  author_fullname: string,
  saved: boolean,
  gilded: number,
  clicked: boolean,
  title: string,
  link_flair_richtext: [] // Array of idk,
  subreddit_name_prefixed: string //path of
} */

//Sample data from https://api.pullpush.io/reddit/search/submission/?subreddit=jokes
/* "data": [
        {
            "approved_at_utc": null,
            "subreddit": "Jokes",
            "selftext": "Touch 'n Go",
            "author_fullname": "t2_5zceb6kp",
            "saved": false,
            "mod_reason_title": null,
            "gilded": 0,
            "clicked": false,
            "title": "What payment system/e-wallet do pedophiles/perverts use?",
            "link_flair_richtext": [],
            "subreddit_name_prefixed": "r/Jokes",
            "hidden": false,
            "pwls": 6,
            "link_flair_css_class": null,
            "downs": 0,
            "thumbnail_height": null,
            "top_awarded_type": null,
            "hide_score": true,
            "name": "t3_17kiagv",
            "quarantine": false,
            "link_flair_text_color": "dark",
            "upvote_ratio": 1.0,
            "author_flair_background_color": null,
            "subreddit_type": "public",
            "ups": 1,
            "total_awards_received": 0,
            "media_embed": {},
            "thumbnail_width": null,
            "author_flair_template_id": null,
            "is_original_content": false,
            "user_reports": [],
            "secure_media": null,
            "is_reddit_media_domain": false,
            "is_meta": false,
            "category": null,
            "secure_media_embed": {},
            "link_flair_text": null,
            "can_mod_post": false,
            "score": 1,
            "approved_by": null,
            "is_created_from_ads_ui": false,
            "author_premium": false,
            "thumbnail": "nsfw",
            "edited": false,
            "author_flair_css_class": null,
            "author_flair_richtext": [],
            "gildings": {},
            "content_categories": null,
            "is_self": true,
            "mod_note": null,
            "created": 1698749768.0,
            "link_flair_type": "text",
            "wls": 6,
            "removed_by_category": null,
            "banned_by": null,
            "author_flair_type": "text",
            "domain": "self.Jokes",
            "allow_live_comments": false,
            "selftext_html": "&lt;!-- SC_OFF --&gt;&lt;div class=\"md\"&gt;&lt;p&gt;Touch &amp;#39;n Go&lt;/p&gt;\n&lt;/div&gt;&lt;!-- SC_ON --&gt;",
            "likes": null,
            "suggested_sort": null,
            "banned_at_utc": null,
            "view_count": null,
            "archived": false,
            "no_follow": true,
            "is_crosspostable": false,
            "pinned": false,
            "over_18": true,
            "all_awardings": [],
            "awarders": [],
            "media_only": false,
            "can_gild": false,
            "spoiler": false,
            "locked": false,
            "author_flair_text": null,
            "treatment_tags": [],
            "visited": false,
            "removed_by": null,
            "num_reports": null,
            "distinguished": null,
            "subreddit_id": "t5_2qh72",
            "author_is_blocked": false,
            "mod_reason_by": null,
            "removal_reason": null,
            "link_flair_background_color": "",
            "id": "17kiagv",
            "is_robot_indexable": true,
            "report_reasons": null,
            "author": "FourRelic822000",
            "discussion_type": null,
            "num_comments": 0,
            "send_replies": true,
            "whitelist_status": "all_ads",
            "contest_mode": false,
            "mod_reports": [],
            "author_patreon_flair": false,
            "author_flair_text_color": null,
            "permalink": "/r/Jokes/comments/17kiagv/what_payment_systemewallet_do_pedophilesperverts/",
            "parent_whitelist_status": "all_ads",
            "stickied": false,
            "url": "https://www.reddit.com/r/Jokes/comments/17kiagv/what_payment_systemewallet_do_pedophilesperverts/",
            "subreddit_subscribers": 27038748,
            "created_utc": 1698749768.0,
            "num_crossposts": 0,
            "media": null,
            "is_video": false
        }, */