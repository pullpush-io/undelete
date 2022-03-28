import React from 'react'
import { Link } from 'react-router-dom'
import { connect } from '../../state'
import { theme } from '../../state'

const Header = props => (
  <header>
    <div id='header'>
      <h1>Unddit</h1>
      <nav>
        <span className='switch-toggle switch-candy-blue nowrap'>
          <input type='radio' name='mode' id={theme.dark} value={theme.dark}
            defaultChecked={props.global.curTheme === theme.dark}
            onChange={e => props.global.setTheme(e.target.value)} />
          <label htmlFor={theme.dark} title='Dark mode'>&#x1F31C;&#xFE0E;</label>
          <input type='radio' name='mode' id={theme.light} value={theme.light}
            defaultChecked={props.global.curTheme === theme.light}
            onChange={e => props.global.setTheme(e.target.value)} />
          <label htmlFor={theme.light} title='Light mode'>&#x2600;&#xFE0E;</label>
          <input type='radio' name='mode' id={theme.system} value={theme.system}
            defaultChecked={props.global.curTheme === theme.system}
            onChange={e => props.global.setTheme(e.target.value)} />
          <label htmlFor={theme.system} title='Same mode as system'>&#x1F4BB;&#xFE0E;</label>
          <a />
        </span>
        <Link className='nowrap' to='/about'>about & FAQ</Link>
      </nav>
    </div>
    <div id='status'>
      {props.global.state.statusText &&
        <p id='status-text'>{props.global.state.statusText}</p>}
      {props.global.state.statusHelpUrl &&
        <Link id='status-helpurl' to={props.global.state.statusHelpUrl}>Need help?</Link>}
      {props.global.state.statusImage &&
        <img id='status-image' src={props.global.state.statusImage} alt='status' />}
    </div>
  </header>
)

export default connect(Header)
