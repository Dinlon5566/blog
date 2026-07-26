/* Inject the Google Tag Manager container into every generated page.
 * The sea theme is an npm dependency, so its head.njk can't be patched in
 * this repo — the injector API adds the snippet at render time instead,
 * which also survives theme upgrades.
 * Container ID comes from `gtm` in _config.yml; leave it empty to disable. */
const GTM_ID = hexo.config.gtm;

// `hexo server` is local preview — keep it out of the analytics data.
if (GTM_ID && hexo.env.cmd !== 'server') {
  hexo.extend.injector.register('head_begin', () => `
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');</script>
<!-- End Google Tag Manager -->
`, 'default');
}
