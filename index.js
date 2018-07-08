const generateBranches = require('./lib/generate-branches');
const isBranchUnderScope = require('./lib/is-branch-under-scope');


function isUnderScope(needleNode, haystackNode) {
	const needleBranches = generateBranches(needleNode);
	const haystackBranches = generateBranches(haystackNode);

	return needleBranches.some((needleBranch) => {
		return haystackBranches.some((haystackBranch) => {
			return isBranchUnderScope(needleBranch, haystackBranch);
		});
	});
}

module.exports = isUnderScope;
