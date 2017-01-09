import parser from 'postcss-selector-parser';

let selectorParser = parser(() => {});
let selectorProcessor = (...processArgs) => {
	return selectorParser.process
		.call(
			selectorParser,
			...processArgs
		)
		.res;
};

export default selectorProcessor;
