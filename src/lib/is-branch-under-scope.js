

// Wrapper around [`container.split`](https://github.com/postcss/postcss-selector-parser/blob/master/API.md#containersplitcallback)
let splitNode = function(node, ...splitArgs) {
	return node.split.apply(node, splitArgs)
		// Remove the combinator piece
		.map((group, index, groups) => {
			if(index < (groups.length - 1)) {
				return group.slice(0, -1);
			}
			return group;
		});
};


let checkMatchingNode = function(needleNode, haystackNode) {
	if(needleNode.type !== haystackNode.type && needleNode.type !== 'universal' && haystackNode.type !== 'universal') {
		return false;
	}

	if(needleNode.type === 'selector') {
		// TODO: recursive somehow
	}
	else if(needleNode.type === 'universal' || haystackNode.type === 'universal') {
		return true;
	}
	else if(needleNode.type === 'tag') {
		return needleNode.value === haystackNode.value;
	}
	else if(needleNode.type === 'class') {
		return needleNode.value === haystackNode.value;
	}
	else if(needleNode.type === 'id') {
		return needleNode.value === haystackNode.value;
	}
	else if(needleNode.type === 'pseudo') {
		return needleNode.value === haystackNode.value;
	}
	else if(needleNode.type === 'attribute') {
		return needleNode.attribute === haystackNode.attribute &&
			(needleNode.value ? (needleNode.value === haystackNode.value) : true);
	}
	else if(needleNode.type === 'nesting') {
		// TODO: warning (should already be converted to explicit)
		// .foo { & .bar {} } -> .foo .bar
	}
};

// Check whether all of the needle is in the haystack
let checkMatchingGroup = function(needleGroup, haystackGroup) {
	let currentHaystackIndex = 0;
	return needleGroup.every(function(needleNode) {

		const availableHaystack = haystackGroup.slice(currentHaystackIndex);

		return availableHaystack.some(function(haystackNode, haystackIndex) {
			console.log('\tneedleNode', needleNode.toString());
			console.log('\thaystackNode', haystackNode.toString());
			const isMatching = checkMatchingNode(needleNode, haystackNode);

			// Move our starting place in the haystack up to where we found the piece so we don't re-match it
			if(isMatching) {
				currentHaystackIndex = haystackIndex;
			}

			console.log('\tisMatching node', isMatching);

			return isMatching;
		});
	})
};


// Does the needle fit in the haystack?
//
// For example, the haystack is where the variable is defined
// and the variable usage is in the needle
//
// // needle
// .foo:hover {
// 	--some-color: #f00;
// }
// // haystack
// .foo {
// 	color: var(--some-color);
// }
let isBranchUnderScope = function(needleBranch, haystackBranch) {
	console.log('ius', needleBranch.selector.toString(), '|||', haystackBranch.selector.toString());

	let haystackGroups = haystackBranch.selector.split((node) => {
		return node.type === 'combinator';
	});
	let needleGroups = needleBranch.selector.split((node) => {
		return node.type === 'combinator';
	});

	return needleGroups.every(function(needleGroup) {
		return haystackGroups.some(function(haystackGroup) {
			console.log('needleGroup', needleGroup.toString());
			console.log('haystackGroup', haystackGroup.toString());
			const isMatching = checkMatchingGroup(needleGroup, haystackGroup);

			console.log('group isMatching', isMatching);

			return isMatching;
		});
	});
}

export default isBranchUnderScope;
