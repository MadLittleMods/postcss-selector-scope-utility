const parser = require('postcss-selector-parser');

const selectorParser = parser(() => {});
function selectorProcessor(...processArgs) {
	return selectorParser.process
		.call(
			selectorParser,
			...processArgs
		)
		.res;
};

module.exports = selectorProcessor;
