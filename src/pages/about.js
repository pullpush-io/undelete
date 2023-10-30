import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { connect } from '../state'

const About = props => {
  document.title = 'About Unddit'
  if (props.global.state.statusImage !== undefined) {
    props.global.clearStatus()
  }

  const { hash } = props.location;

  useEffect(() => {
    const id = hash.substr(1)
    if (id)
      document.getElementById(id)?.scrollIntoView({behavior: 'smooth'})
  }, [hash])

  return (
    <div id='main'>
      <div id='main-box'>
        <h2 className='about'>About</h2>
        <p>
          Display
          <b className='removed-text' title='Removed by mods'> removed </b>
          (by mods) and
          <b className='deleted-text' title='Deleted by users'> deleted </b>
          (by users) comments/posts for Reddit.
        </p>
        <p>
          <b>PC Usage</b>: Press Ctrl-Shift-B to view the bookmark bar, and then drag this bookmarklet:
          <a className='bookmarklet' href='javascript:window.open(location.href.replace(/:\/\/([\w-]+.)?(reddit\.com\/r|reveddit\.com\/v)\//i, "://undelete.pullpush.io/r/"), "_blank")'>
            Unddit
          </a>
          to the bar and click it when viewing a Reddit post.
          <br /><br />
          Alternatively you can manually replace the <i>www.reddit.com</i> in the URL with <i>undelete.pullpush.io</i>.
          <br />
          E.g. <Link to='/r/Bitcoin/comments/7jzpir/'>https://undelete.pullpush.io/r/Bitcoin/comments/7jzpir/</Link>
        </p>
        <p>
          Created by <a href='https://github.com/JubbeArt/'>Jesper Wrang</a> and
          uses <a href='https://pullpush.io/'>PullPush service</a> for getting removed comments.
          <img src="images/ps_narrow_light.png" alt="Powered by PullPush" />
        </p>
        <h2 className='todo'>FAQ</h2>
        <div id='delete' className={hash == '#delete' ? 'highlighted' : undefined}>
        <b className='question'><Link to='/about#delete'>Q:</Link> I posted some sensitive information on Reddit. Can you delete this from your page?</b>
        <p>
          Yes. Please submit a ticket to <a href='https://removals.pullpush.io/'>PullPush Removal Service</a>.
        </p>
        </div>
        <div id='how' className={hash == '#how' ? 'highlighted' : undefined}>
        <b className='question'><Link to='/about#how'>Q:</Link> How does it work?</b>
        <p>
          This page is only possible because of the work done by PullPush.
          Their service <a href='https://pullpush.io/'>PullPush</a> actively listens for new comments on Reddit and stores them in a database.
          Then sites like Unddit and Reveddit can fetch these comments from Pushshift.
          Unddit knows what comments Reddit shows (from Reddit&apos;s API) and what comments should be shown (from Pushshift&apos;s API).
          By comparing the comments from these 2 APIs, it can figure out what has been deleted and removed.
        </p>
        </div>
        <div id='firefox' className={hash == '#firefox' ? 'highlighted' : undefined}>
        <b className='question'><Link to='/about#firefox'>Q:</Link> Why doesn&apos;t it work in Firefox?</b>
        <p>
          If you have enabled Strict Enhanced Tracking Protection in Firefox, this will prevent Unddit from contacting Reddit&apos;s API.
          Luckily there is an easy workaround.
          Click on the shield symbol on the left side of the address bar, and then switch off Enhanced Tracking Protection for this site.
          It will still be enabled for other sites.
        </p>
        </div>
        <div id='edge' className={hash == '#edge' ? 'highlighted' : undefined}>
        <b className='question'><Link to='/about#edge'>Q:</Link> Why doesn&apos;t it work in Edge?</b>
        <p>
          If you have enabled Strict Tracking Protection in Edge, this will prevent Unddit from contacting Reddit&apos;s API.
          Luckily there is an easy workaround.
          Click on the padlock symbol on the left side of the address bar, and then switch off Tracking Protection for this site.
          It will still be enabled for other sites.
        </p>
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
