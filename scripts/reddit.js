// Starts subreddit scraping operations on reddit
// using a really small subset of subreddit groups
require('../globals');

var async = require('async');

var subredditRoute = require(__routes+'/reddit/wall');

var subreddits = [
	'cscareerquestions',
	'compsci',
	'careerguidance',
	'ITCareerQuestions',
];

async.eachLimit(subreddits, 10, createSubredditOperation, onFinish);

function createSubredditOperation(subreddit, callback) {
	console.log('Starting op: reddit:wall ('+subreddit+')');
	subredditRoute.initialize(subreddit, callback);
}

function onFinish(err) {
	if (err) return console.error(err);
	console.log(subreddits.length+' operations created. Script finished.');
	console.log('Now, start the engine. ( hint: node index )');
	process.exit(0);
}
