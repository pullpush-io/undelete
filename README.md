# Unddit
[Unddit](https://www.unddit.com) is a site for undoing the removal of comments from [Reddit](https://www.reddit.com).
Just go to any reddit post and replace the `re` of `reddit` in the URL with `un` to see all removed comments.

This is a done by comparing the comments being stored in [Jason Baumgartner's](https://pushshift.io/) [Pushshift Reddit API](https://github.com/pushshift/api) and the ones from Reddit's API. The frontend, developed by Jesper Wrang and originally available at [removeddit.com](https://removeddit.com), is written in [React](https://reactjs.org/) and uses [Sass](https://sass-lang.com/) as the CSS Preprocessor.

# Development
Download [npm](https://www.npmjs.com/get-npm) 

```bash
git clone https://github.com/gurnec/removeddit.git && cd removeddit

npm install
npm start
```

This will build the Javascript files and launch a local server for development. Visit http://localhost:8080 and make sure the site is running. If you're getting connection errors to Reddit or Pushshift, it might be because you're running a VPN. Try turning it off for development.

The CSS is build seperatly (to keep the build steps / configs very simple) by running
```bash
npm run css
```
