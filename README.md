
# shirt - a minimalistic publication outlet engine

shirt consists of a javascript frontend for statically served content written in one of various markdown dialects. To create a blog or publish posts, shirt provides a site compiler written in shell and awk. The two ends are bound together by a little protocol specification.

It is an exercise in minimalism. It also turned out to be _blazingly_ fast, especially through a tiny straw of an uplink!


## caveats

*Please Note:* This piece is an early prototype, some of the code is experimental, documentation and features are lacking, all is ugly. But I intend to clean it all up in the near future.

- No online web editor, no user accounts. This is intentional. But it also means no commenting feature.
- Without javascript, all pages are empty. That is also by design.

- Site indexing is a problem for applications like this one. See *sitemaps* below for a discussion.
- My syntax extensions to marked are lacking support for TeX blocks, and I've overenthusiastically tweaked some standard markers to match those available on google+, which I think I should take back.


## setting up

1. Clone the repository.

2. download katex.tar.gz from https://github.com/khan/katex/ and unpack it inside the contrib directory.

3. Inside the resulting directory, create another directory named "md", to hold your drafts.
4. Pick a skin from the src/skin directory, say simple-blog and run the backend:
```
bin/shirt init simple-blog
```
This should create a htdocs directory which you can browse locally or sync to your server.
It should be safe to change your mind later and re-run the create command with a different skin.
Note also that the command generates many symlinks and you're not supposed to edit files in the htdocs directory by hand. Instead edit the files the src directory.
5. Write a blog post by creating a file in your md with the filename extension .md. You can also add a directory by the same name to hold extra files like images. You can reference these files (or ones from other posts) by their relative name as seen from your post file.
You should think about a naming scheme right now to keep your files organized. Changing the filenames later will expose your audience to the change and break links out there. That's very bad, so better think hard now.
6. Publish your draft:
```
bin/shirt publish my-post
```
Note that it will copy your files by default, so you can work on updates without risking accidentally syncing your changes prematurely.
7. Sync your latest snapshot of the htdocs directory with your server directory.


## shirt components:

- front-side
  - written in javascript
  - KaTeX support for math rendering
  - various markdown dialects provided by marked
  - widgets
    - archive index
    - recent post teasers
    - full post
    - tag cloud (implementation incomplete)
  - skins
    - simple blogging
    - simple slide presentation
    - simple manual presentation

- protocol
  - index.json: contains lines with json objects containing a string element named "file". All other fields are passed to the frontend. The backend generates timestamps, and multiple entries if a post gets published again. This is allowed.
  - md/<post>.md: Is a markdown file with an optional header section. Any header fields are also added to the index. The file itself may refer to other external resources like this:
  - md/<post>/<image>.png: The markdown file may refer to other file objects using links like this. In our case the frontend runs from a path above the md directory, so it has to rewrite any links that appear in the markdown.

- back-side
  - written in sh and awk, works with busybox
    - copies files
    - manages timestamps and an index file


## sitemaps

The backend attempts to generate a shadow site for crawlers, so they can find the content without executing any javascript. It consists of a sitemap linking to html files containing copies of raw markdown as a reasonable approximation. This happens to avoid a reimplementation of a full server side markdown parser.

So search engines will generate links to these indexed files. When viewed by a user with javascript enabled, he will be redireced to the interactive main url. Let's hope that's not too spurious for search engines. I honestly don't know! I've added a link from the main page to the sitemap, maybe that helps a little.

But a large problem remains! We may not earn better page rankings for separate posts, because crawlers will not find any content where users on other platforms points them by linking to us: the main page. Perhaps it then gets all the page scores, which may be not good for users. Hey, there is a standard for this:

https://developers.google.com/webmasters/ajax-crawling/docs/specification

It says that the application should use "#!" in links, which would then get transformed by _the crawler_ to something else, where a "?" appears instead. This is bad. It means that the server side needs to understand query notation and deliver rendered content in that case. But...

This whole endeavour was intended to be served via IPFS! Which means we can't use http queries! Because the _feature_ of IPFS is that all links are static (content hashed to be more precise)! Think of it as a webserver which can only serve static files. You can't add rewriting rules either. I feel sabotaged.

So, it does generate a sitemap at the moment. It's ugly, but it might be just about sufficient. Or I'll come up with something better. Or Google might...


## tips

previewing posts - The create and publish commands accept a --site option to change the htdocs directory. It's best to copy a snapshot your current htdocs directory, say, named "preview", so you get to preview your site as it is now. Then publish your post there until you're happy. To shorten your workflow it's a good idea to publish with the --link option, so you don't have to republish every time you edit.

comments and user feedback - shirt provides no commenting engine. It does, however come with some widgets to incorporate other commenting and social media platforms. 


## todo

- parametrize skins
  - just refer to external files, the user places them in htdocs how?
- configuration?
  - site title
  - widgets
- header lines for md files to be embedded in the index
  - markup dialect selection via headers
- tag extraction
  - wordcloud widget
- better crawler support (see sitemaps)
