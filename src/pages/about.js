import React from 'react'
import { connect } from '../state'

const About = props => {
  document.title = 'About Unddit'
  if (props.global.state.statusImage !== undefined) {
    props.global.clearStatus()
  }

  return (
    <div id='main'>
      <div id='main-box'>
        <h2 className='about'>About</h2>
        <p>
          Display
          <b className='removed-text' title='Removed by mods'> removed </b>
          (by mods) and
          <b className='deleted-text' title='Deleted by users'> deleted </b>
          (by users) comments/posts from  Reddit.
        </p>
        <p>
          <b>Usage</b>: Drag this bookmarklet
          <a className='bookmarklet' href='javascript:window.open(location.href.replace(/:\/\/([\w-]+.)?(reddit\.com\/r|reveddit\.com\/v)\//i, "://www.unddit.com/r/"), "_blank")'>
            Unddit
          </a>
          to your bookmark bar and use it to get from reddit to Unddit.
          <br /><br />
          Alternatively you can manually replace the <i>re</i> of <i>reddit</i> in the URL with <i>un</i>.
          <br />
          E.g. <a href='/r/Bitcoin/comments/7jzpir/'>https://unddit.com/r/Bitcoin/comments/7jzpir/</a>
        </p>
        <p>
          Created by
          <a href='https://github.com/JubbeArt/'> Jesper Wrang </a> and uses
          <a href='https://pushshift.io/'> Jason Baumgartner's </a> service for getting removed comments.
        </p>
        <h2 className='todo'>FAQ</h2>
        <b className='question'>Q: I posted some sensitive information on Reddit. Can you delete this from your page?</b>
        <p>
          No, I can't remove anything myself since I am not the not the one storing all the deleted comments.
          This is done by an external service run by Jason Baumgartner.
          If you want something sensitive removed permanently you should follow the <a href='https://www.reddit.com/r/pushshift/comments/pat409/online_removal_request_form_for_removal_requests/'>instructions here</a>.
        </p>
        <b className='question'>Q: Didn't this site used to be named Removeddit?</b>
        <p>
          The Removeddit site stopped working a short while ago, and this site was made to partially replace it.
          All creddit for the software which makes this site possible goes to the original author, Jesper Wrang.
          Any bugs or problems are due to this site's operator.
          In particular, Unddit does not currently support browsing subreddits, only specific posts.
        </p>
        <b className='question'>Q: How does it work?</b>
        <p>
          This page is only possible because of the amazing work done by Jason.
          His site <a href='https://pushshift.io/'>pushshift.io</a> activly listens for new comments on reddit and stores them in his own database.
          Then sites like Unddit and reveddit can fetch these comment from pushshift.
          Unddit know what comment reddit shows (from Reddits API) and what comment should be showed (from Pushshifts API).
          By comparing the comments from these 2 APIs, we can figure out what has been deleted and removed.
        </p>
        <b className='question'>Q: What's the difference between ceddit and Removeddit?</b>
        <p>
          Not much. Removeddit was created as a temporary replacement for ceddit, at a time when ceddit didn't work.
          I thought this was necessary since I used ceddit more then Reddit itself.
          Months later ceddit was fixed, but I didn't see any reason to remove what I had done.
          Today both sites live side by side and strive for the same goal.
        </p>
        <div>
          There are some minor differences in them though:
          <ul>
            <li>
              Ceddit respect user made deletions while removeddit does not. This decision was made early on and I feel like it's too late to change now.
              If I had created removeddit today I might had thought more about what was right here.
            </li>
            <li>
              Removeddit usualy loads faster since it uses a slightly different algorithm for detecting removed comments.
              Removeddit also uses significantly less JavaScript on the page which also should make the page load faster.
            </li>
            <li>
              Ceddit provides user lookup while removeddit doesn't.
            </li>
          </ul>
        </div>

        <h2 className='contact'>Links</h2>
        <p>
          <a href='https://github.com/gurnec/removeddit'>Code on Github.</a>
        </p>
      </div>
    </div>
  )
}

export default connect(About)
