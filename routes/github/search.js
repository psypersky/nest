var Route = require(__framework+'/Route');

var route = new Route({
	title: 'Search Results',
	name:  'github:search',
	url:   'https://github.com/search?p=<%= state.currentPage %>&type=Users&q=<%= query %>',
	priority: 80,
	test: {
		query: 'nodejs',
		shouldCreateItems:  true,
		shouldSpawnOperations: true,
	}
});

// This function is executed in the PhantomJS contex;
// we have no access to the context out of this function
route.scraper = function() {
	var data = {
		hasNextPage: !!$('.next_page').attr('href'),
		items: [],
		operations: [],
	};

	// For each user
	$('.user-list-item').each(function() {
		var $elem, $meta, $info, $location, link, profile;

		$elem = $(this);
		$meta = $elem.find('.user-list-meta');
		$info = $elem.find('.user-list-info');
		$location = $meta.find('.octicon-location').parent();

		link = $info.find('a').attr('href') ?
			'https://github.com'+$info.find('a').attr('href') :
			null;

		// Create the user profile
		profile = {
			name:  format($info.clone().children().remove().end().text()),
			key: $meta.find('.email').text() || null,
			image: $elem.find('img.avatar').attr('src'),

			local: {
				link: link,
				data: {
					username:   $info.find('a').attr('href').substr(1),
					joinedDate: $meta.find('.join-date').attr('datetime'),
					location:   format($location.clone().children().remove().end().text()),
				},
			}
		};

		if ( profile.key ) {
			data.items.push(profile);
		}

		// Create operations to `profile` routes
		// Ej. Schedule the routes to be scraped later
		data.operations.push({
			routeName: 'github:profile',
			query: profile.local.data.username,
		});

	});

	// Remove new lines and trim
	function format(string) {
		var trimmed = '';
		string.split('\n').forEach( function(line) {
			if (line.trim().length) {
				trimmed = line.trim();
			}
		});
		return trimmed;
	}

	return data;
};

module.exports = route;
