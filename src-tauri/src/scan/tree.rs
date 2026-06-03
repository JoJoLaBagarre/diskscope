//! Size aggregation and ordering helpers over the flat node arena.

use super::{Node, SortKey};

/// Fill in directory sizes by summing each subtree, bottom-up.
///
/// We compute a pre-order index list by DFS from `root`, then walk it in
/// reverse (leaves first) adding each node's size to its parent. This is robust
/// regardless of the order entries were inserted into the arena, and uses an
/// explicit stack to avoid recursion limits on deep trees.
pub fn aggregate_sizes(nodes: &mut [Node], root: usize) {
    if nodes.is_empty() {
        return;
    }
    let mut order: Vec<usize> = Vec::with_capacity(nodes.len());
    let mut stack: Vec<usize> = vec![root];
    while let Some(i) = stack.pop() {
        order.push(i);
        for &c in &nodes[i].children {
            stack.push(c);
        }
    }
    for &i in order.iter().rev() {
        if let Some(p) = nodes[i].parent {
            let s = nodes[i].size;
            nodes[p].size += s;
        }
    }
}

/// Sort a list of node indices in place by the chosen key.
pub fn sort_indices(nodes: &[Node], idxs: &mut [usize], sort: SortKey, desc: bool) {
    idxs.sort_unstable_by(|&a, &b| {
        let (na, nb) = (&nodes[a], &nodes[b]);
        let ord = match sort {
            SortKey::Size => na.size.cmp(&nb.size),
            SortKey::Name => na.name.to_lowercase().cmp(&nb.name.to_lowercase()),
            SortKey::Mtime => na.mtime.cmp(&nb.mtime),
        };
        if desc {
            ord.reverse()
        } else {
            ord
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn node(name: &str, size: u64, is_dir: bool, parent: Option<usize>) -> Node {
        Node {
            name: name.to_string(),
            path: PathBuf::from(name),
            size,
            is_dir,
            mtime: None,
            parent,
            children: Vec::new(),
            removed: false,
        }
    }

    #[test]
    fn aggregates_sizes_bottom_up() {
        // root(0) ┬ a(1, dir) ┬ f1(2, 10)
        //         │           └ f2(3, 20)
        //         └ b(4, file, 5)
        let mut nodes = vec![
            node("root", 0, true, None),
            node("a", 0, true, Some(0)),
            node("f1", 10, false, Some(1)),
            node("f2", 20, false, Some(1)),
            node("b", 5, false, Some(0)),
        ];
        nodes[0].children = vec![1, 4];
        nodes[1].children = vec![2, 3];

        aggregate_sizes(&mut nodes, 0);

        assert_eq!(nodes[1].size, 30, "dir 'a' = 10 + 20");
        assert_eq!(nodes[0].size, 35, "root = 30 + 5");
    }

    #[test]
    fn sorts_by_size_desc() {
        let nodes = vec![
            node("a", 10, false, None),
            node("b", 30, false, None),
            node("c", 20, false, None),
        ];
        let mut idxs = vec![0, 1, 2];
        sort_indices(&nodes, &mut idxs, SortKey::Size, true);
        assert_eq!(idxs, vec![1, 2, 0]);
    }
}
