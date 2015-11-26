import createRoute from '../../src/route';

const route = createRoute({
  provider: 'sinembargo',
  name:     'post',
  url:      'http://www.sinembargo.mx/<%= query %>',
  priority: 90,

  // Optional: Enable an automated test for this route
  test: {
    query: '20-03-2015/1288239',
    shouldCreateItems:  true,
    shouldSpawnOperations: false
  }
});

route.scraper = function($) {
  const data = {
    items: []
  };

  const itemUrl = this.location.href;
  const posted = $('.date').text();

  const body = $('.post_text_inner p').map(function() {
    const $p = $(this);
    return $p.text().trim();
  }).get().join('\n');

  data.items.push({
    url:       itemUrl,
    key:       itemUrl.replace('http://www.sinembargo.mx/', ''),
    name:      $('.post_text_inner h1').text(),
    body:      body,
    posted:    posted    // new Date(...) ?
  });

  return data;
};

export default route;