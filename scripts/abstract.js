/* Fill post.abstract from the <!-- more --> excerpt so the sea theme's
 * sea-post-abstract truncates at <!-- more --> instead of a fixed length.
 * Posts without <!-- more --> keep the theme's default behaviour. */
hexo.extend.filter.register('after_post_render', function (data) {
  if (!data.abstract && data.excerpt) {
    data.abstract = data.excerpt
      .replace(/<[^>]+>/g, '')   // strip HTML tags (incl. the empty headers)
      .replace(/\s+/g, ' ')       // collapse whitespace
      .trim();
  }
  return data;
}, 20); // run after Hexo's built-in excerpt filter so data.excerpt is ready
