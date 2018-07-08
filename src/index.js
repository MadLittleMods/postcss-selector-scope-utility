import generateBranches from './lib/generate-branches';
import isBranchUnderScope from './lib/is-branch-under-scope';


function isUnderScope(needleNode, haystackNode) {
	const needleBranches = generateBranches(needleNode);
	const haystackBranches = generateBranches(haystackNode);

	return needleBranches.some((needleBranch) => {
		return haystackBranches.some((haystackBranch) => {
			return isBranchUnderScope(needleBranch, haystackBranch);
		});
	});
}

export default isUnderScope;
