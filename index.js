const path = require('path');
const fs = require('fs');
const fsUtils = require('nodejs-fs-utils');
const parseDate = require('date-fns/parseISO');
const isValidDate = require('date-fns/isValid');
const htmlParser = require('htmlparser2');
const Feed = require('feed').Feed;

module.exports = function (options) {
  const baseUrl = options.baseUrl;
  const outputPath = options.outputPath || 'feed.xml';
  const feedOptions = {
    id: baseUrl,
    link: baseUrl,
    favicon: baseUrl + '/favicon.ico',
    author: {
      name: 'Moandji Ezana',
      email: 'moandji@ezana.net',
      link: baseUrl
    }
  };
  const posts = [];

  fsUtils.walkSync('.', (err, filePath, stats, next) => {
    if (path.extname(filePath) !== '.html') {
      next();
      return;
    }
    
    const html = fs.readFileSync(filePath).toString();
    let inArticleTag = false;
    let inSiteTitleTag = false;
    let articleText = '';
    const post = {};
    const parserStream = new htmlParser.Parser({
      onopentag(name, attrs) {
        if (name === 'article') {
          inArticleTag = true;
        } else if (name === 'time') {
          const date = parseDate(attrs.datetime);
          if (isValidDate(date)) {
            post.date = date;
          }
        } else if (name === 'title') {
          inSiteTitleTag = true;
        } else if (inArticleTag) {
          articleText += `<${name}>`;
        }
      },
      ontext(text) {
        if (inArticleTag) {
          articleText += text;
        } else if (inSiteTitleTag) {
          feedOptions.title = text;
        }
      },
      onclosetag(name) {
        if (name === 'article') {
          inArticleTag = false;
          post.content = articleText;
          if (post.date) {
            posts.push(post)
          }
        } else if (name === 'time') {
          inTimeTag = false;
        } else if (name === 'title') {
          inSiteTitleTag = false;
        } else if (inArticleTag) {
          articleText += `</${name}>`;
        }
      }
    }, { decodeEntities: true });
    parserStream.write(html);

    next();
  });

  const rssFeed = new Feed(feedOptions);
  posts.sort((post1, post2) => post2.date.getTime() - post1.date.getTime());
  posts.forEach(post => rssFeed.addItem(post));

  const rss = rssFeed.rss2();
  fs.writeFileSync(outputPath, rss)

  return rss;
}
