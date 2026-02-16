import { useState, useEffect, useCallback, useMemo } from "react";

const TOPIC_GRAPH = {
  implementation: { name: "Implementation", icon: "⚙️", prereqs: [], tier: 0 },
  math_basic: { name: "Basic Math", icon: "🔢", prereqs: [], tier: 0 },
  sorting: { name: "Sorting & Greedy", icon: "📊", prereqs: ["implementation"], tier: 0 },
  binary_search: { name: "Binary Search", icon: "🎯", prereqs: ["sorting"], tier: 1 },
  two_pointers: { name: "Two Pointers", icon: "👆", prereqs: ["sorting"], tier: 1 },
  prefix_sums: { name: "Prefix Sums", icon: "∑", prereqs: ["implementation"], tier: 1 },
  number_theory: { name: "Number Theory", icon: "🔐", prereqs: ["math_basic"], tier: 1 },
  bfs_dfs: { name: "BFS / DFS", icon: "🌐", prereqs: ["implementation"], tier: 1 },
  shortest_paths: { name: "Shortest Paths", icon: "🛤️", prereqs: ["bfs_dfs"], tier: 2 },
  dsu: { name: "Union-Find / DSU", icon: "🔗", prereqs: ["bfs_dfs"], tier: 2 },
  topo_sort: { name: "Topological Sort", icon: "📐", prereqs: ["bfs_dfs"], tier: 2 },
  dp_basic: { name: "DP Fundamentals", icon: "📦", prereqs: ["prefix_sums", "binary_search"], tier: 2 },
  trees: { name: "Trees", icon: "🌲", prereqs: ["bfs_dfs", "dp_basic"], tier: 2 },
  strings: { name: "String Algorithms", icon: "🔤", prereqs: ["implementation", "prefix_sums"], tier: 2 },
  dp_intermediate: { name: "DP Intermediate", icon: "🧩", prereqs: ["dp_basic"], tier: 3 },
  seg_tree: { name: "Segment Trees / BIT", icon: "🏗️", prereqs: ["trees", "prefix_sums"], tier: 3 },
  combinatorics: { name: "Combinatorics", icon: "🎲", prereqs: ["number_theory", "dp_basic"], tier: 3 },
  game_theory: { name: "Game Theory", icon: "♟️", prereqs: ["dp_basic", "math_basic"], tier: 3 },
  graphs_advanced: { name: "Advanced Graphs", icon: "🕸️", prereqs: ["shortest_paths", "dsu", "topo_sort"], tier: 3 },
  dp_advanced: { name: "DP Advanced", icon: "🧬", prereqs: ["dp_intermediate", "seg_tree"], tier: 4 },
  geometry: { name: "Geometry", icon: "📐", prereqs: ["math_basic", "sorting"], tier: 3 },
  advanced: { name: "Advanced Topics", icon: "🚀", prereqs: ["graphs_advanced", "dp_advanced"], tier: 4 },
};

const PROBLEMS = [
  // === IMPLEMENTATION (Tier 0) ===
  { id: "1A", name: "Theatre Square", rating: 1000, topic: "implementation", url: "https://codeforces.com/problemset/problem/1/A" },
  { id: "4A", name: "Watermelon", rating: 800, topic: "implementation", url: "https://codeforces.com/problemset/problem/4/A" },
  { id: "158A", name: "Next Round", rating: 800, topic: "implementation", url: "https://codeforces.com/problemset/problem/158/A" },
  { id: "71A", name: "Way Too Long Words", rating: 800, topic: "implementation", url: "https://codeforces.com/problemset/problem/71/A" },
  { id: "236A", name: "Boy or Girl", rating: 800, topic: "implementation", url: "https://codeforces.com/problemset/problem/236/A" },
  { id: "266B", name: "Queue at the School", rating: 900, topic: "implementation", url: "https://codeforces.com/problemset/problem/266/B" },
  { id: "1560B", name: "Who's Opposite?", rating: 900, topic: "implementation", url: "https://codeforces.com/problemset/problem/1560/B" },
  { id: "1352C", name: "K-th Not Divisible by n", rating: 1200, topic: "implementation", url: "https://codeforces.com/problemset/problem/1352/C" },
  { id: "1343C", name: "Alternating Subsequence", rating: 1200, topic: "implementation", url: "https://codeforces.com/problemset/problem/1343/C" },
  { id: "1490C", name: "Sum of Cubes", rating: 1100, topic: "implementation", url: "https://codeforces.com/problemset/problem/1490/C" },

  // === BASIC MATH (Tier 0) ===
  { id: "1294A", name: "Collecting Coins", rating: 800, topic: "math_basic", url: "https://codeforces.com/problemset/problem/1294/A" },
  { id: "1511B", name: "GCD Length", rating: 1100, topic: "math_basic", url: "https://codeforces.com/problemset/problem/1511/B" },
  { id: "1360D", name: "Buying Shovels", rating: 1000, topic: "math_basic", url: "https://codeforces.com/problemset/problem/1360/D" },
  { id: "1462C", name: "Unique Number", rating: 900, topic: "math_basic", url: "https://codeforces.com/problemset/problem/1462/C" },
  { id: "1374C", name: "Move Brackets", rating: 1000, topic: "math_basic", url: "https://codeforces.com/problemset/problem/1374/C" },
  { id: "1541B", name: "Pleasant Pairs", rating: 1200, topic: "math_basic", url: "https://codeforces.com/problemset/problem/1541/B" },
  { id: "1475C", name: "Ball in Berland", rating: 1400, topic: "math_basic", url: "https://codeforces.com/problemset/problem/1475/C" },
  { id: "1426D", name: "Non-zero Segments", rating: 1300, topic: "math_basic", url: "https://codeforces.com/problemset/problem/1426/D" },

  // === SORTING & GREEDY (Tier 0) ===
  { id: "1353B", name: "Two Arrays And Swaps", rating: 800, topic: "sorting", url: "https://codeforces.com/problemset/problem/1353/B" },
  { id: "1399C", name: "Boats Competition", rating: 1200, topic: "sorting", url: "https://codeforces.com/problemset/problem/1399/C" },
  { id: "1490D", name: "Permutation Transformation", rating: 1000, topic: "sorting", url: "https://codeforces.com/problemset/problem/1490/D" },
  { id: "1367C", name: "Social Distance", rating: 1300, topic: "sorting", url: "https://codeforces.com/problemset/problem/1367/C" },
  { id: "1462D", name: "Add to Neighbour and Remove", rating: 1400, topic: "sorting", url: "https://codeforces.com/problemset/problem/1462/D" },
  { id: "1520D", name: "Same Differences", rating: 1200, topic: "sorting", url: "https://codeforces.com/problemset/problem/1520/D" },
  { id: "1472D", name: "Even-Odd Game", rating: 1200, topic: "sorting", url: "https://codeforces.com/problemset/problem/1472/D" },
  { id: "1324D", name: "Pair of Topics", rating: 1400, topic: "sorting", url: "https://codeforces.com/problemset/problem/1324/D" },
  { id: "1157C2", name: "Increasing Subsequence (hard)", rating: 1700, topic: "sorting", url: "https://codeforces.com/problemset/problem/1157/C2" },
  { id: "1203D", name: "Remove the Substring", rating: 1500, topic: "sorting", url: "https://codeforces.com/problemset/problem/1203/D" },

  // === BINARY SEARCH (Tier 1) ===
  { id: "1607D", name: "Blue-Red Permutation", rating: 1300, topic: "binary_search", url: "https://codeforces.com/problemset/problem/1607/D" },
  { id: "1370C", name: "Number Game", rating: 1400, topic: "binary_search", url: "https://codeforces.com/problemset/problem/1370/C" },
  { id: "1201C", name: "Maximum Median", rating: 1400, topic: "binary_search", url: "https://codeforces.com/problemset/problem/1201/C" },
  { id: "1208B", name: "Uniqueness", rating: 1500, topic: "binary_search", url: "https://codeforces.com/problemset/problem/1208/B" },
  { id: "1187B", name: "Letters Shop", rating: 1300, topic: "binary_search", url: "https://codeforces.com/problemset/problem/1187/B" },
  { id: "1352D", name: "Alice, Bob and Candies", rating: 1300, topic: "binary_search", url: "https://codeforces.com/problemset/problem/1352/D" },
  { id: "1623C", name: "Balanced Stone Heaps", rating: 1600, topic: "binary_search", url: "https://codeforces.com/problemset/problem/1623/C" },
  { id: "1077D", name: "Cutting Out", rating: 1600, topic: "binary_search", url: "https://codeforces.com/problemset/problem/1077/D" },
  { id: "1100E", name: "Andrew and Taxi", rating: 1900, topic: "binary_search", url: "https://codeforces.com/problemset/problem/1100/E" },
  { id: "460C", name: "Present", rating: 1700, topic: "binary_search", url: "https://codeforces.com/problemset/problem/460/C" },

  // === TWO POINTERS (Tier 1) ===
  { id: "1462E", name: "Close Segments", rating: 1500, topic: "two_pointers", url: "https://codeforces.com/problemset/problem/1462/E" },
  { id: "1358D", name: "The Best Vacation", rating: 1600, topic: "two_pointers", url: "https://codeforces.com/problemset/problem/1358/D" },
  { id: "1611E1", name: "Escape The Maze (easy)", rating: 1200, topic: "two_pointers", url: "https://codeforces.com/problemset/problem/1611/E1" },
  { id: "1555C", name: "Coin Rows", rating: 1300, topic: "two_pointers", url: "https://codeforces.com/problemset/problem/1555/C" },
  { id: "1537D", name: "Deleting Divisors", rating: 1500, topic: "two_pointers", url: "https://codeforces.com/problemset/problem/1537/D" },
  { id: "279B", name: "Books", rating: 1400, topic: "two_pointers", url: "https://codeforces.com/problemset/problem/279/B" },
  { id: "1354C", name: "Simple Polygon Embedding", rating: 1500, topic: "two_pointers", url: "https://codeforces.com/problemset/problem/1354/C" },
  { id: "1151C", name: "Problem for Nazar", rating: 1500, topic: "two_pointers", url: "https://codeforces.com/problemset/problem/1151/C" },

  // === PREFIX SUMS (Tier 1) ===
  { id: "1398C", name: "Good Subarrays", rating: 1600, topic: "prefix_sums", url: "https://codeforces.com/problemset/problem/1398/C" },
  { id: "1176C", name: "Lose it!", rating: 1300, topic: "prefix_sums", url: "https://codeforces.com/problemset/problem/1176/C" },
  { id: "1535C", name: "Unstable String", rating: 1400, topic: "prefix_sums", url: "https://codeforces.com/problemset/problem/1535/C" },
  { id: "1516B", name: "AGAGA XOOORRR", rating: 1500, topic: "prefix_sums", url: "https://codeforces.com/problemset/problem/1516/B" },
  { id: "1355C", name: "Count Triangles", rating: 1500, topic: "prefix_sums", url: "https://codeforces.com/problemset/problem/1355/C" },
  { id: "1480B", name: "The Great Hero", rating: 1300, topic: "prefix_sums", url: "https://codeforces.com/problemset/problem/1480/B" },
  { id: "1428C", name: "ABBB", rating: 1300, topic: "prefix_sums", url: "https://codeforces.com/problemset/problem/1428/C" },
  { id: "816B", name: "Karen and Coffee", rating: 1400, topic: "prefix_sums", url: "https://codeforces.com/problemset/problem/816/B" },

  // === NUMBER THEORY (Tier 1) ===
  { id: "1475D", name: "Cleaning the Phone", rating: 1800, topic: "number_theory", url: "https://codeforces.com/problemset/problem/1475/D" },
  { id: "1459C", name: "Row GCD", rating: 1600, topic: "number_theory", url: "https://codeforces.com/problemset/problem/1459/C" },
  { id: "1295C", name: "Obtain The String", rating: 1400, topic: "number_theory", url: "https://codeforces.com/problemset/problem/1295/C" },
  { id: "1514C", name: "Product 1 Modulo N", rating: 1600, topic: "number_theory", url: "https://codeforces.com/problemset/problem/1514/C" },
  { id: "1538D", name: "Another Problem About Dividing Numbers", rating: 1700, topic: "number_theory", url: "https://codeforces.com/problemset/problem/1538/D" },
  { id: "1294D", name: "MEX maximizing", rating: 1600, topic: "number_theory", url: "https://codeforces.com/problemset/problem/1294/D" },
  { id: "1154D", name: "Two Teams Composing", rating: 1600, topic: "number_theory", url: "https://codeforces.com/problemset/problem/1154/D" },
  { id: "1352G", name: "Special Permutation", rating: 1600, topic: "number_theory", url: "https://codeforces.com/problemset/problem/1352/G" },
  { id: "1228C", name: "Primes and Multiplication", rating: 1700, topic: "number_theory", url: "https://codeforces.com/problemset/problem/1228/C" },
  { id: "1245C", name: "Constanze's Machine", rating: 1400, topic: "number_theory", url: "https://codeforces.com/problemset/problem/1245/C" },

  // === BFS / DFS (Tier 1) ===
  { id: "1033A", name: "King Escape", rating: 1000, topic: "bfs_dfs", url: "https://codeforces.com/problemset/problem/1033/A" },
  { id: "1272D", name: "Remove One Element", rating: 1500, topic: "bfs_dfs", url: "https://codeforces.com/problemset/problem/1272/D" },
  { id: "1037D", name: "Valid BFS?", rating: 1600, topic: "bfs_dfs", url: "https://codeforces.com/problemset/problem/1037/D" },
  { id: "1385E", name: "Directing Edges", rating: 1700, topic: "bfs_dfs", url: "https://codeforces.com/problemset/problem/1385/E" },
  { id: "1092F", name: "Tree with Maximum Cost", rating: 1900, topic: "bfs_dfs", url: "https://codeforces.com/problemset/problem/1092/F" },
  { id: "1144F", name: "Graph Without Long Directed Paths", rating: 1700, topic: "bfs_dfs", url: "https://codeforces.com/problemset/problem/1144/F" },
  { id: "1176E", name: "Cover it!", rating: 1700, topic: "bfs_dfs", url: "https://codeforces.com/problemset/problem/1176/E" },
  { id: "115A", name: "Party", rating: 1000, topic: "bfs_dfs", url: "https://codeforces.com/problemset/problem/115/A" },
  { id: "580C", name: "Kefa and Park", rating: 1500, topic: "bfs_dfs", url: "https://codeforces.com/problemset/problem/580/C" },
  { id: "377A", name: "Maze", rating: 1600, topic: "bfs_dfs", url: "https://codeforces.com/problemset/problem/377/A" },

  // === SHORTEST PATHS (Tier 2) ===
  { id: "20C", name: "Dijkstra?", rating: 1900, topic: "shortest_paths", url: "https://codeforces.com/problemset/problem/20/C" },
  { id: "1328E", name: "Tree Queries", rating: 1900, topic: "shortest_paths", url: "https://codeforces.com/problemset/problem/1328/E" },
  { id: "1209E", name: "Rotate Columns", rating: 2000, topic: "shortest_paths", url: "https://codeforces.com/problemset/problem/1209/E" },
  { id: "601A", name: "The Two Routes", rating: 1600, topic: "shortest_paths", url: "https://codeforces.com/problemset/problem/601/A" },
  { id: "1209D", name: "Cow and Snacks", rating: 1700, topic: "shortest_paths", url: "https://codeforces.com/problemset/problem/1209/D" },
  { id: "786B", name: "Legacy", rating: 2200, topic: "shortest_paths", url: "https://codeforces.com/problemset/problem/786/B" },
  { id: "545E", name: "Paths and Trees", rating: 2000, topic: "shortest_paths", url: "https://codeforces.com/problemset/problem/545/E" },
  { id: "1076D", name: "Edge Deletion", rating: 1800, topic: "shortest_paths", url: "https://codeforces.com/problemset/problem/1076/D" },

  // === DSU (Tier 2) ===
  { id: "1513D", name: "GCD and MST", rating: 1900, topic: "dsu", url: "https://codeforces.com/problemset/problem/1513/D" },
  { id: "1559D2", name: "Mocha and Diana (Hard)", rating: 2100, topic: "dsu", url: "https://codeforces.com/problemset/problem/1559/D2" },
  { id: "1411C", name: "Peaceful Rooks", rating: 1700, topic: "dsu", url: "https://codeforces.com/problemset/problem/1411/C" },
  { id: "1249D2", name: "Too Many Segments (hard)", rating: 1800, topic: "dsu", url: "https://codeforces.com/problemset/problem/1249/D2" },
  { id: "25D", name: "Roads not only in Berland", rating: 1800, topic: "dsu", url: "https://codeforces.com/problemset/problem/25/D" },
  { id: "1619F", name: "Let's Play the Game", rating: 1800, topic: "dsu", url: "https://codeforces.com/problemset/problem/1619/F" },
  { id: "1618F", name: "Reverse", rating: 1800, topic: "dsu", url: "https://codeforces.com/problemset/problem/1618/F" },
  { id: "722C", name: "Destroying Array", rating: 1600, topic: "dsu", url: "https://codeforces.com/problemset/problem/722/C" },

  // === TOPOLOGICAL SORT (Tier 2) ===
  { id: "510C", name: "Fox And Names", rating: 1600, topic: "topo_sort", url: "https://codeforces.com/problemset/problem/510/C" },
  { id: "1159D", name: "The Story of a Tree", rating: 1900, topic: "topo_sort", url: "https://codeforces.com/problemset/problem/1159/D" },
  { id: "825E", name: "Minimal Labels", rating: 1900, topic: "topo_sort", url: "https://codeforces.com/problemset/problem/825/E" },
  { id: "1463D", name: "Pairs", rating: 1900, topic: "topo_sort", url: "https://codeforces.com/problemset/problem/1463/D" },
  { id: "1213G", name: "Path Queries", rating: 1800, topic: "topo_sort", url: "https://codeforces.com/problemset/problem/1213/G" },
  { id: "1100E2", name: "Andrew and Taxi (harder)", rating: 1900, topic: "topo_sort", url: "https://codeforces.com/problemset/problem/1100/E" },

  // === DP FUNDAMENTALS (Tier 2) ===
  { id: "455A", name: "Boredom", rating: 1500, topic: "dp_basic", url: "https://codeforces.com/problemset/problem/455/A" },
  { id: "189A", name: "Cut Ribbon", rating: 1300, topic: "dp_basic", url: "https://codeforces.com/problemset/problem/189/A" },
  { id: "1324E", name: "Sleeping Schedule", rating: 1600, topic: "dp_basic", url: "https://codeforces.com/problemset/problem/1324/E" },
  { id: "1472E", name: "Correct Placement", rating: 1700, topic: "dp_basic", url: "https://codeforces.com/problemset/problem/1472/E" },
  { id: "1195C", name: "Basketball Exercise", rating: 1400, topic: "dp_basic", url: "https://codeforces.com/problemset/problem/1195/C" },
  { id: "1433E", name: "Two Round Dances", rating: 1300, topic: "dp_basic", url: "https://codeforces.com/problemset/problem/1433/E" },
  { id: "1525C", name: "Robot Collisions", rating: 2000, topic: "dp_basic", url: "https://codeforces.com/problemset/problem/1525/C" },
  { id: "1097B", name: "Petr and a Combination Lock", rating: 1200, topic: "dp_basic", url: "https://codeforces.com/problemset/problem/1097/B" },
  { id: "1365D", name: "Solve The Maze", rating: 1700, topic: "dp_basic", url: "https://codeforces.com/problemset/problem/1365/D" },
  { id: "977F", name: "Consecutive Subsequence", rating: 1700, topic: "dp_basic", url: "https://codeforces.com/problemset/problem/977/F" },
  { id: "1183H", name: "Subsequences (hard version)", rating: 1900, topic: "dp_basic", url: "https://codeforces.com/problemset/problem/1183/H" },
  { id: "1303C", name: "Perfect Keyboard", rating: 1600, topic: "dp_basic", url: "https://codeforces.com/problemset/problem/1303/C" },

  // === TREES (Tier 2) ===
  { id: "1328E2", name: "Tree Queries", rating: 1900, topic: "trees", url: "https://codeforces.com/problemset/problem/1328/E" },
  { id: "1092F2", name: "Tree with Maximum Cost", rating: 1900, topic: "trees", url: "https://codeforces.com/problemset/problem/1092/F" },
  { id: "1339C", name: "Powered Addition", rating: 1500, topic: "trees", url: "https://codeforces.com/problemset/problem/1339/C" },
  { id: "1141F1", name: "Same Sum Blocks (Easy)", rating: 1600, topic: "trees", url: "https://codeforces.com/problemset/problem/1141/F1" },
  { id: "1294F", name: "Three Paths on a Tree", rating: 1900, topic: "trees", url: "https://codeforces.com/problemset/problem/1294/F" },
  { id: "1529C", name: "Parsa's Humongous Tree", rating: 1600, topic: "trees", url: "https://codeforces.com/problemset/problem/1529/C" },
  { id: "1490F", name: "Equalize the Array", rating: 1500, topic: "trees", url: "https://codeforces.com/problemset/problem/1490/F" },
  { id: "600E", name: "Lomsat gelral", rating: 2000, topic: "trees", url: "https://codeforces.com/problemset/problem/600/E" },

  // === STRINGS (Tier 2) ===
  { id: "1535D", name: "Playoff Tournament", rating: 1800, topic: "strings", url: "https://codeforces.com/problemset/problem/1535/D" },
  { id: "1313C2", name: "Skyscrapers (hard version)", rating: 1900, topic: "strings", url: "https://codeforces.com/problemset/problem/1313/C2" },
  { id: "271D", name: "Good Substrings", rating: 1500, topic: "strings", url: "https://codeforces.com/problemset/problem/271/D" },
  { id: "126B", name: "Password", rating: 1700, topic: "strings", url: "https://codeforces.com/problemset/problem/126/B" },
  { id: "1204D", name: "Kirk and a Binary String", rating: 1900, topic: "strings", url: "https://codeforces.com/problemset/problem/1204/D" },
  { id: "432D", name: "Prefixes and Suffixes", rating: 2000, topic: "strings", url: "https://codeforces.com/problemset/problem/432/D" },
  { id: "1187C", name: "Vasya And Array", rating: 1800, topic: "strings", url: "https://codeforces.com/problemset/problem/1187/C" },
  { id: "535D", name: "Tavas and Malekas", rating: 1900, topic: "strings", url: "https://codeforces.com/problemset/problem/535/D" },

  // === DP INTERMEDIATE (Tier 3) ===
  { id: "1025D", name: "Recovering BST", rating: 2400, topic: "dp_intermediate", url: "https://codeforces.com/problemset/problem/1025/D" },
  { id: "1178D", name: "Prime Graph", rating: 1500, topic: "dp_intermediate", url: "https://codeforces.com/problemset/problem/1178/D" },
  { id: "1139D", name: "Steps to One", rating: 2100, topic: "dp_intermediate", url: "https://codeforces.com/problemset/problem/1139/D" },
  { id: "1108E2", name: "Array and Segments (Hard)", rating: 2000, topic: "dp_intermediate", url: "https://codeforces.com/problemset/problem/1108/E2" },
  { id: "1061D", name: "TV Shows", rating: 2000, topic: "dp_intermediate", url: "https://codeforces.com/problemset/problem/1061/D" },
  { id: "1029D", name: "Concatenation of Rounds", rating: 1900, topic: "dp_intermediate", url: "https://codeforces.com/problemset/problem/1029/D" },
  { id: "118D", name: "Caesar's Legions", rating: 1700, topic: "dp_intermediate", url: "https://codeforces.com/problemset/problem/118/D" },
  { id: "1248C", name: "Ivan the Fool and the Probability", rating: 1800, topic: "dp_intermediate", url: "https://codeforces.com/problemset/problem/1248/C" },
  { id: "1194D", name: "1-2-K Game", rating: 1700, topic: "dp_intermediate", url: "https://codeforces.com/problemset/problem/1194/D" },
  { id: "1062D", name: "Fun with Integers", rating: 1800, topic: "dp_intermediate", url: "https://codeforces.com/problemset/problem/1062/D" },

  // === SEGMENT TREES / BIT (Tier 3) ===
  { id: "339D", name: "Xenia and Bit Operations", rating: 1700, topic: "seg_tree", url: "https://codeforces.com/problemset/problem/339/D" },
  { id: "380C", name: "Sereja and Brackets", rating: 2000, topic: "seg_tree", url: "https://codeforces.com/problemset/problem/380/C" },
  { id: "474F", name: "Ant colony", rating: 2100, topic: "seg_tree", url: "https://codeforces.com/problemset/problem/474/F" },
  { id: "1311F", name: "Moving Points", rating: 1900, topic: "seg_tree", url: "https://codeforces.com/problemset/problem/1311/F" },
  { id: "459D", name: "Pashmak and Parmida's Problem", rating: 1800, topic: "seg_tree", url: "https://codeforces.com/problemset/problem/459/D" },
  { id: "1208D", name: "Restore Permutation", rating: 1500, topic: "seg_tree", url: "https://codeforces.com/problemset/problem/1208/D" },
  { id: "52C", name: "Circular RMQ", rating: 2000, topic: "seg_tree", url: "https://codeforces.com/problemset/problem/52/C" },
  { id: "1093G", name: "Multidimensional Queries", rating: 2300, topic: "seg_tree", url: "https://codeforces.com/problemset/problem/1093/G" },

  // === COMBINATORICS (Tier 3) ===
  { id: "1312D", name: "Count the Arrays", rating: 1700, topic: "combinatorics", url: "https://codeforces.com/problemset/problem/1312/D" },
  { id: "1436C", name: "Binary Search", rating: 1500, topic: "combinatorics", url: "https://codeforces.com/problemset/problem/1436/C" },
  { id: "1549D", name: "Integers Have Friends", rating: 1800, topic: "combinatorics", url: "https://codeforces.com/problemset/problem/1549/D" },
  { id: "1288C", name: "Two Arrays", rating: 1600, topic: "combinatorics", url: "https://codeforces.com/problemset/problem/1288/C" },
  { id: "1462F", name: "The Treasure of The Segments", rating: 1800, topic: "combinatorics", url: "https://codeforces.com/problemset/problem/1462/F" },
  { id: "1248D1", name: "The World Is Just a Programming Task (Easy)", rating: 1800, topic: "combinatorics", url: "https://codeforces.com/problemset/problem/1248/D1" },
  { id: "1359D", name: "Yet Another Yet Another Task", rating: 1800, topic: "combinatorics", url: "https://codeforces.com/problemset/problem/1359/D" },
  { id: "1110D", name: "Jongmah", rating: 2000, topic: "combinatorics", url: "https://codeforces.com/problemset/problem/1110/D" },

  // === GAME THEORY (Tier 3) ===
  { id: "1537E1", name: "Erase and Extend (Easy)", rating: 1600, topic: "game_theory", url: "https://codeforces.com/problemset/problem/1537/E1" },
  { id: "1194D2", name: "1-2-K Game", rating: 1700, topic: "game_theory", url: "https://codeforces.com/problemset/problem/1194/D" },
  { id: "850C", name: "Arpa and a game with Mojtaba", rating: 2000, topic: "game_theory", url: "https://codeforces.com/problemset/problem/850/C" },
  { id: "1537D2", name: "Deleting Divisors", rating: 1500, topic: "game_theory", url: "https://codeforces.com/problemset/problem/1537/D" },
  { id: "768E", name: "Game of Stones", rating: 2100, topic: "game_theory", url: "https://codeforces.com/problemset/problem/768/E" },
  { id: "1498C", name: "Planar Reflections", rating: 1600, topic: "game_theory", url: "https://codeforces.com/problemset/problem/1498/C" },

  // === ADVANCED GRAPHS (Tier 3) ===
  { id: "1144G", name: "Two Merged Sequences", rating: 1900, topic: "graphs_advanced", url: "https://codeforces.com/problemset/problem/1144/G" },
  { id: "1083A", name: "The Fair Nut and the Best Path", rating: 2000, topic: "graphs_advanced", url: "https://codeforces.com/problemset/problem/1083/A" },
  { id: "1076E", name: "Vasya and a Tree", rating: 1900, topic: "graphs_advanced", url: "https://codeforces.com/problemset/problem/1076/E" },
  { id: "1156D", name: "0-1-Tree", rating: 1900, topic: "graphs_advanced", url: "https://codeforces.com/problemset/problem/1156/D" },
  { id: "1027D", name: "Mouse Hunt", rating: 1800, topic: "graphs_advanced", url: "https://codeforces.com/problemset/problem/1027/D" },
  { id: "1263D", name: "Secret Passwords", rating: 1500, topic: "graphs_advanced", url: "https://codeforces.com/problemset/problem/1263/D" },
  { id: "936B", name: "Sleepy Game", rating: 2100, topic: "graphs_advanced", url: "https://codeforces.com/problemset/problem/936/B" },
  { id: "1000E", name: "We Need More Bosses", rating: 2100, topic: "graphs_advanced", url: "https://codeforces.com/problemset/problem/1000/E" },

  // === GEOMETRY (Tier 3) ===
  { id: "1059D", name: "Nature Reserve", rating: 2100, topic: "geometry", url: "https://codeforces.com/problemset/problem/1059/D" },
  { id: "1401D", name: "Maximum Distributed Tree", rating: 1800, topic: "geometry", url: "https://codeforces.com/problemset/problem/1401/D" },
  { id: "1059C", name: "Sequence Transformation", rating: 1600, topic: "geometry", url: "https://codeforces.com/problemset/problem/1059/C" },
  { id: "598C", name: "Nearest vectors", rating: 2300, topic: "geometry", url: "https://codeforces.com/problemset/problem/598/C" },
  { id: "2A", name: "Winner", rating: 1500, topic: "geometry", url: "https://codeforces.com/problemset/problem/2/A" },
  { id: "166B", name: "Polygons", rating: 1600, topic: "geometry", url: "https://codeforces.com/problemset/problem/166/B" },

  // === DP ADVANCED (Tier 4) ===
  { id: "1188B", name: "Count Pairs", rating: 2100, topic: "dp_advanced", url: "https://codeforces.com/problemset/problem/1188/B" },
  { id: "1101D", name: "GCD Counting", rating: 2000, topic: "dp_advanced", url: "https://codeforces.com/problemset/problem/1101/D" },
  { id: "1313E", name: "Concatenation with intersection", rating: 2400, topic: "dp_advanced", url: "https://codeforces.com/problemset/problem/1313/E" },
  { id: "1097D", name: "Makoto and a Blackboard", rating: 2200, topic: "dp_advanced", url: "https://codeforces.com/problemset/problem/1097/D" },
  { id: "1178F", name: "Long Colorful Strip", rating: 2300, topic: "dp_advanced", url: "https://codeforces.com/problemset/problem/1178/F" },
  { id: "1117D", name: "Magic Gems", rating: 1900, topic: "dp_advanced", url: "https://codeforces.com/problemset/problem/1117/D" },
  { id: "1152D", name: "Neko and Aki's Prank", rating: 1900, topic: "dp_advanced", url: "https://codeforces.com/problemset/problem/1152/D" },
  { id: "1187E", name: "Tree Painting", rating: 2100, topic: "dp_advanced", url: "https://codeforces.com/problemset/problem/1187/E" },

  // === ADVANCED TOPICS (Tier 4) ===
  { id: "1137C", name: "Museums Tour", rating: 2400, topic: "advanced", url: "https://codeforces.com/problemset/problem/1137/C" },
  { id: "1039D", name: "You Are Given a Tree", rating: 2400, topic: "advanced", url: "https://codeforces.com/problemset/problem/1039/D" },
  { id: "1093F", name: "Vasya and Array", rating: 2000, topic: "advanced", url: "https://codeforces.com/problemset/problem/1093/F" },
  { id: "1197E", name: "Culture Code", rating: 2300, topic: "advanced", url: "https://codeforces.com/problemset/problem/1197/E" },
  { id: "1167F", name: "Scalar Queries", rating: 2200, topic: "advanced", url: "https://codeforces.com/problemset/problem/1167/F" },
  { id: "960E", name: "Alternating Tree", rating: 2200, topic: "advanced", url: "https://codeforces.com/problemset/problem/960/E" },
];

const TIER_LABELS = ["Foundations", "Core", "Intermediate", "Advanced", "Expert"];
const TIER_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444"];
const TIER_BG = ["rgba(34,197,94,0.08)", "rgba(59,130,246,0.08)", "rgba(168,85,247,0.08)", "rgba(245,158,11,0.08)", "rgba(239,68,68,0.08)"];

const MONTHS_PLAN = [
  { month: "Feb–Mar", focus: "Foundations", topics: ["implementation", "math_basic", "sorting"], goal: "Solve Div2 A/B consistently in < 10 min each" },
  { month: "Mar–Apr", focus: "Core Algorithms I", topics: ["binary_search", "two_pointers", "prefix_sums", "number_theory"], goal: "Comfortable with Div2 C, start solving some D" },
  { month: "Apr–May", focus: "Core Algorithms II", topics: ["bfs_dfs", "dp_basic"], goal: "Graph traversal & basic DP on autopilot" },
  { month: "May–Jun", focus: "Intermediate I", topics: ["shortest_paths", "dsu", "topo_sort", "trees"], goal: "Solve Div2 D consistently, attempt E" },
  { month: "Jun–Jul", focus: "Intermediate II", topics: ["strings", "dp_intermediate", "combinatorics"], goal: "Handle most Div2 D/E problems" },
  { month: "Jul–Aug", focus: "Advanced", topics: ["seg_tree", "game_theory", "graphs_advanced", "geometry"], goal: "Competitive at regional level" },
  { month: "Aug–Sep", focus: "Polish & Team Strategy", topics: ["dp_advanced", "advanced"], goal: "Virtual contests, team coordination, speed" },
];

const DEFAULT_MEMBERS = ["Theodora", "Member 2", "Member 3", "Member 4", "Member 5", "Member 6", "Member 7"];

export default function ICPCTrainer() {
  const [view, setView] = useState("dashboard");
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [members, setMembers] = useState(DEFAULT_MEMBERS);
  const [solvedMap, setSolvedMap] = useState({});
  const [editingMember, setEditingMember] = useState(null);
  const [editName, setEditName] = useState("");
  const [filterRating, setFilterRating] = useState([0, 3000]);
  const [loaded, setLoaded] = useState(false);
  const [cfStats, setCfStats] = useState(null);
  const [fetchingCF, setFetchingCF] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await window.storage.get("icpc-training-data");
        if (data) {
          const parsed = JSON.parse(data.value);
          if (parsed.members) setMembers(parsed.members);
          if (parsed.solvedMap) setSolvedMap(parsed.solvedMap);
        }
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await window.storage.set("icpc-training-data", JSON.stringify({ members, solvedMap }));
      } catch (e) {}
    })();
  }, [members, solvedMap, loaded]);

  const toggleSolved = useCallback((memberId, problemId) => {
    setSolvedMap(prev => {
      const key = `${memberId}::${problemId}`;
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  }, []);

  const stats = useMemo(() => {
    const topicStats = {};
    Object.keys(TOPIC_GRAPH).forEach(t => {
      const probs = PROBLEMS.filter(p => p.topic === t);
      const solved = probs.filter(p => members.some((_, i) => solvedMap[`${i}::${p.id}`])).length;
      topicStats[t] = { total: probs.length, solved };
    });
    return topicStats;
  }, [solvedMap, members]);

  const totalSolved = useMemo(() => {
    const unique = new Set();
    Object.keys(solvedMap).forEach(k => {
      const pid = k.split("::")[1];
      unique.add(pid);
    });
    return unique.size;
  }, [solvedMap]);

  const memberStats = useMemo(() => {
    return members.map((name, idx) => {
      const count = PROBLEMS.filter(p => solvedMap[`${idx}::${p.id}`]).length;
      return { name, count, idx };
    });
  }, [members, solvedMap]);

  const fetchCFStats = async () => {
    setFetchingCF(true);
    try {
      const resp = await fetch("https://codeforces.com/api/problemset.problems");
      const data = await resp.json();
      if (data.status === "OK") {
        const problems = data.result.problems;
        const tagCount = {};
        const ratingDist = {};
        problems.forEach(p => {
          (p.tags || []).forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; });
          if (p.rating) { ratingDist[p.rating] = (ratingDist[p.rating] || 0) + 1; }
        });
        setCfStats({ total: problems.length, tagCount, ratingDist });
      }
    } catch (e) {
      setCfStats({ error: true });
    }
    setFetchingCF(false);
  };

  const startEditMember = (idx) => {
    setEditingMember(idx);
    setEditName(members[idx]);
  };
  const saveMemberName = () => {
    if (editName.trim()) {
      setMembers(prev => prev.map((m, i) => i === editingMember ? editName.trim() : m));
    }
    setEditingMember(null);
  };

  const topicsByTier = useMemo(() => {
    const tiers = [[], [], [], [], []];
    Object.entries(TOPIC_GRAPH).forEach(([key, val]) => {
      tiers[val.tier].push({ key, ...val });
    });
    return tiers;
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "#e2e2e8",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #13131a; }
        ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 3px; }
        .nav-btn { background: none; border: 1px solid transparent; color: #8888a0; padding: 8px 16px; cursor: pointer; font-family: inherit; font-size: 13px; border-radius: 6px; transition: all 0.2s; }
        .nav-btn:hover { color: #c0c0d0; background: rgba(255,255,255,0.03); }
        .nav-btn.active { color: #00ffa3; border-color: rgba(0,255,163,0.3); background: rgba(0,255,163,0.05); }
        .topic-card { border: 1px solid #1e1e2e; border-radius: 10px; padding: 16px; cursor: pointer; transition: all 0.25s; position: relative; overflow: hidden; }
        .topic-card:hover { border-color: #3a3a5a; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .problem-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 8px; transition: all 0.15s; border: 1px solid transparent; }
        .problem-row:hover { background: rgba(255,255,255,0.02); border-color: #1e1e2e; }
        .check-btn { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #3a3a5a; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .check-btn.checked { background: #00ffa3; border-color: #00ffa3; }
        .rating-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .progress-bar { height: 4px; border-radius: 2px; background: #1a1a2a; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
        .glow { box-shadow: 0 0 20px rgba(0,255,163,0.1); }
        .fade-in { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        .month-card { border: 1px solid #1e1e2e; border-radius: 10px; padding: 18px; transition: all 0.2s; }
        .month-card:hover { border-color: #2a2a4a; }
        a { color: #00ffa3; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .member-pill { padding: 4px 10px; border-radius: 20px; font-size: 11px; border: 1px solid #2a2a3a; cursor: pointer; transition: all 0.2s; background: #13131a; }
        .member-pill:hover { border-color: #4a4a6a; }
        .stat-box { background: #13131a; border: 1px solid #1e1e2e; border-radius: 10px; padding: 20px; text-align: center; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1a1a2a", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#00ffa3", fontFamily: "'Space Grotesk', sans-serif" }}>⚡ CF:ICPC</span>
          <span style={{ fontSize: 12, color: "#55556a", marginTop: 2 }}>Training Platform</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            ["dashboard", "Dashboard"],
            ["skills", "Skill Tree"],
            ["problems", "Problems"],
            ["timeline", "Timeline"],
            ["team", "Team"],
          ].map(([k, label]) => (
            <button key={k} className={`nav-btn ${view === k ? "active" : ""}`} onClick={() => { setView(k); if (k !== "problems") setSelectedTopic(null); }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }} className="fade-in">
        {/* ============ DASHBOARD ============ */}
        {view === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              <div className="stat-box">
                <div style={{ fontSize: 32, fontWeight: 700, color: "#00ffa3" }}>{totalSolved}</div>
                <div style={{ fontSize: 12, color: "#6a6a80", marginTop: 4 }}>/ {PROBLEMS.length} problems solved</div>
              </div>
              <div className="stat-box">
                <div style={{ fontSize: 32, fontWeight: 700, color: "#3b82f6" }}>{Object.keys(TOPIC_GRAPH).filter(t => stats[t]?.solved === stats[t]?.total && stats[t]?.total > 0).length}</div>
                <div style={{ fontSize: 12, color: "#6a6a80", marginTop: 4 }}>/ {Object.keys(TOPIC_GRAPH).length} topics completed</div>
              </div>
              <div className="stat-box">
                <div style={{ fontSize: 32, fontWeight: 700, color: "#a855f7" }}>{members.length}</div>
                <div style={{ fontSize: 12, color: "#6a6a80", marginTop: 4 }}>team members</div>
              </div>
              <div className="stat-box">
                <div style={{ fontSize: 32, fontWeight: 700, color: "#f59e0b" }}>{Math.round((totalSolved / PROBLEMS.length) * 100)}%</div>
                <div style={{ fontSize: 12, color: "#6a6a80", marginTop: 4 }}>overall progress</div>
              </div>
            </div>

            <h3 style={{ fontSize: 14, color: "#8888a0", marginBottom: 16, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>TOPIC PROGRESS</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {Object.entries(TOPIC_GRAPH).map(([key, topic]) => {
                const s = stats[key] || { total: 0, solved: 0 };
                const pct = s.total ? Math.round((s.solved / s.total) * 100) : 0;
                return (
                  <div key={key} className="topic-card" onClick={() => { setSelectedTopic(key); setView("problems"); }}
                    style={{ background: TIER_BG[topic.tier] }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{topic.icon} {topic.name}</span>
                      <span className="rating-badge" style={{ background: TIER_COLORS[topic.tier] + "20", color: TIER_COLORS[topic.tier] }}>
                        {TIER_LABELS[topic.tier]}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: TIER_COLORS[topic.tier] }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#6a6a80", marginTop: 6 }}>{s.solved}/{s.total} solved ({pct}%)</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============ SKILL TREE ============ */}
        {view === "skills" && (
          <div>
            <h3 style={{ fontSize: 14, color: "#8888a0", marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>SKILL TREE — PREREQUISITE GRAPH</h3>
            <p style={{ fontSize: 12, color: "#55556a", marginBottom: 24 }}>Each row is a tier. Arrows show prerequisites. Click a topic to see its problems.</p>
            {topicsByTier.map((tier, tierIdx) => (
              <div key={tierIdx} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: TIER_COLORS[tierIdx], fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                    Tier {tierIdx}: {TIER_LABELS[tierIdx]}
                  </span>
                  <div style={{ flex: 1, height: 1, background: TIER_COLORS[tierIdx] + "30" }} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {tier.map(topic => {
                    const s = stats[topic.key] || { total: 0, solved: 0 };
                    const pct = s.total ? Math.round((s.solved / s.total) * 100) : 0;
                    const prereqsMet = topic.prereqs.every(p => {
                      const ps = stats[p] || { total: 0, solved: 0 };
                      return ps.total > 0 && ps.solved / ps.total >= 0.5;
                    });
                    return (
                      <div key={topic.key} className="topic-card" onClick={() => { setSelectedTopic(topic.key); setView("problems"); }}
                        style={{
                          minWidth: 180, flex: "1 1 180px", maxWidth: 240,
                          background: TIER_BG[tierIdx],
                          opacity: (tierIdx === 0 || prereqsMet) ? 1 : 0.5,
                          borderColor: pct === 100 ? TIER_COLORS[tierIdx] + "60" : undefined,
                        }}>
                        <div style={{ fontSize: 16, marginBottom: 4 }}>{topic.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{topic.name}</div>
                        {topic.prereqs.length > 0 && (
                          <div style={{ fontSize: 10, color: "#55556a", marginBottom: 6 }}>
                            ← {topic.prereqs.map(p => TOPIC_GRAPH[p]?.icon || p).join(" ")}
                          </div>
                        )}
                        <div className="progress-bar" style={{ marginBottom: 4 }}>
                          <div className="progress-fill" style={{ width: `${pct}%`, background: TIER_COLORS[tierIdx] }} />
                        </div>
                        <div style={{ fontSize: 10, color: "#6a6a80" }}>{s.solved}/{s.total}</div>
                        {!prereqsMet && tierIdx > 0 && (
                          <div style={{ fontSize: 9, color: "#ef4444", marginTop: 4 }}>🔒 Complete prereqs first</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============ PROBLEMS ============ */}
        {view === "problems" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <select value={selectedTopic || ""} onChange={e => setSelectedTopic(e.target.value || null)}
                style={{ background: "#13131a", border: "1px solid #2a2a3a", color: "#e2e2e8", padding: "8px 12px", borderRadius: 6, fontFamily: "inherit", fontSize: 13 }}>
                <option value="">All Topics</option>
                {Object.entries(TOPIC_GRAPH).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.name}</option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: "#55556a" }}>
                Rating: {filterRating[0]}–{filterRating[1] >= 3000 ? "∞" : filterRating[1]}
              </span>
              <input type="range" min={0} max={3000} step={100} value={filterRating[0]}
                onChange={e => setFilterRating([+e.target.value, filterRating[1]])}
                style={{ width: 80, accentColor: "#00ffa3" }} />
              <input type="range" min={0} max={3000} step={100} value={filterRating[1]}
                onChange={e => setFilterRating([filterRating[0], +e.target.value])}
                style={{ width: 80, accentColor: "#00ffa3" }} />
            </div>

            {selectedTopic && TOPIC_GRAPH[selectedTopic] && (
              <div style={{ marginBottom: 16, padding: "12px 16px", background: TIER_BG[TOPIC_GRAPH[selectedTopic].tier], border: `1px solid ${TIER_COLORS[TOPIC_GRAPH[selectedTopic].tier]}30`, borderRadius: 8 }}>
                <span style={{ fontSize: 16 }}>{TOPIC_GRAPH[selectedTopic].icon}</span>
                <span style={{ fontSize: 15, fontWeight: 600, marginLeft: 8, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {TOPIC_GRAPH[selectedTopic].name}
                </span>
                {TOPIC_GRAPH[selectedTopic].prereqs.length > 0 && (
                  <span style={{ fontSize: 11, color: "#8888a0", marginLeft: 12 }}>
                    Prerequisites: {TOPIC_GRAPH[selectedTopic].prereqs.map(p => TOPIC_GRAPH[p]?.name).join(", ")}
                  </span>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {members.map((m, idx) => (
                <span key={idx} className="member-pill" style={{ background: idx === 0 ? "rgba(0,255,163,0.08)" : undefined, borderColor: idx === 0 ? "rgba(0,255,163,0.3)" : undefined }}>
                  {m}
                </span>
              ))}
            </div>

            <div>
              {PROBLEMS
                .filter(p => (!selectedTopic || p.topic === selectedTopic) && p.rating >= filterRating[0] && p.rating <= filterRating[1])
                .sort((a, b) => a.rating - b.rating)
                .map(problem => {
                  const ratingColor = problem.rating <= 1200 ? "#22c55e" : problem.rating <= 1600 ? "#3b82f6" : problem.rating <= 2000 ? "#a855f7" : problem.rating <= 2400 ? "#f59e0b" : "#ef4444";
                  const solvedBy = members.filter((_, i) => solvedMap[`${i}::${problem.id}`]).length;
                  return (
                    <div key={problem.id} className="problem-row">
                      <div style={{ display: "flex", gap: 4 }}>
                        {members.map((_, idx) => (
                          <button key={idx} className={`check-btn ${solvedMap[`${idx}::${problem.id}`] ? "checked" : ""}`}
                            onClick={() => toggleSolved(idx, problem.id)}
                            title={members[idx]}>
                            {solvedMap[`${idx}::${problem.id}`] && <span style={{ fontSize: 10, color: "#0a0a0f" }}>✓</span>}
                          </button>
                        ))}
                      </div>
                      <span className="rating-badge" style={{ background: ratingColor + "20", color: ratingColor, minWidth: 45, textAlign: "center" }}>
                        {problem.rating}
                      </span>
                      <a href={problem.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, flex: 1 }}>
                        {problem.id} — {problem.name}
                      </a>
                      {!selectedTopic && (
                        <span style={{ fontSize: 10, color: "#55556a", cursor: "pointer" }}
                          onClick={() => setSelectedTopic(problem.topic)}>
                          {TOPIC_GRAPH[problem.topic]?.icon} {TOPIC_GRAPH[problem.topic]?.name}
                        </span>
                      )}
                      {solvedBy > 0 && (
                        <span style={{ fontSize: 10, color: "#00ffa3" }}>{solvedBy}/{members.length}</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ============ TIMELINE ============ */}
        {view === "timeline" && (
          <div>
            <h3 style={{ fontSize: 14, color: "#8888a0", marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>7-MONTH TRAINING PLAN → SEPTEMBER REGIONALS</h3>
            <p style={{ fontSize: 12, color: "#55556a", marginBottom: 24 }}>Click topic tags to jump to those problems.</p>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 20, top: 0, bottom: 0, width: 2, background: "linear-gradient(to bottom, #00ffa3, #3b82f6, #a855f7, #f59e0b, #ef4444)" }} />
              {MONTHS_PLAN.map((m, idx) => (
                <div key={idx} className="month-card fade-in" style={{ marginLeft: 44, marginBottom: 16, animationDelay: `${idx * 0.05}s`, position: "relative" }}>
                  <div style={{ position: "absolute", left: -33, top: 18, width: 12, height: 12, borderRadius: "50%", background: TIER_COLORS[Math.min(idx, 4)], border: "2px solid #0a0a0f" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: TIER_COLORS[Math.min(idx, 4)], fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{m.month}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 6 }}>{m.focus}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {m.topics.map(t => (
                      <span key={t} className="member-pill" onClick={() => { setSelectedTopic(t); setView("problems"); }}
                        style={{ cursor: "pointer", borderColor: TIER_COLORS[TOPIC_GRAPH[t]?.tier || 0] + "40" }}>
                        {TOPIC_GRAPH[t]?.icon} {TOPIC_GRAPH[t]?.name}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: "#8888a0" }}>🎯 {m.goal}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ TEAM ============ */}
        {view === "team" && (
          <div>
            <h3 style={{ fontSize: 14, color: "#8888a0", marginBottom: 20, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>TEAM ROSTER & PROGRESS</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {memberStats.map((m, idx) => {
                const pct = Math.round((m.count / PROBLEMS.length) * 100);
                const topTopics = Object.keys(TOPIC_GRAPH).map(t => {
                  const probs = PROBLEMS.filter(p => p.topic === t);
                  const solved = probs.filter(p => solvedMap[`${idx}::${p.id}`]).length;
                  return { topic: t, solved, total: probs.length };
                }).filter(x => x.solved > 0).sort((a, b) => b.solved - a.solved).slice(0, 3);

                return (
                  <div key={idx} className="topic-card" style={{ background: "#0f0f18" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      {editingMember === idx ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <input value={editName} onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && saveMemberName()}
                            style={{ background: "#1a1a2a", border: "1px solid #3a3a5a", color: "#e2e2e8", padding: "4px 8px", borderRadius: 4, fontFamily: "inherit", fontSize: 13, width: 140 }}
                            autoFocus />
                          <button onClick={saveMemberName} style={{ background: "#00ffa3", color: "#0a0a0f", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600 }}>Save</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer" }}
                          onClick={() => startEditMember(idx)}>
                          {m.name} ✏️
                        </span>
                      )}
                      <span style={{ fontSize: 20, fontWeight: 700, color: "#00ffa3" }}>{m.count}</span>
                    </div>
                    <div className="progress-bar" style={{ marginBottom: 8 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #00ffa3, #3b82f6)" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#6a6a80", marginBottom: 10 }}>{pct}% complete</div>
                    {topTopics.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: "#55556a", marginBottom: 4 }}>Top topics:</div>
                        {topTopics.map(t => (
                          <div key={t.topic} style={{ fontSize: 11, color: "#8888a0", marginBottom: 2 }}>
                            {TOPIC_GRAPH[t.topic]?.icon} {TOPIC_GRAPH[t.topic]?.name}: {t.solved}/{t.total}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============ CF EXPLORER ============ */}
        {view === "api" && (
          <div>
            <h3 style={{ fontSize: 14, color: "#8888a0", marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>CODEFORCES PROBLEM EXPLORER</h3>
            <p style={{ fontSize: 12, color: "#55556a", marginBottom: 16 }}>
              Pull the full Codeforces problem set via their API. This gives you the complete graph of 10,000+ problems with tags and ratings.
            </p>
            <button onClick={fetchCFStats} disabled={fetchingCF}
              style={{
                background: fetchingCF ? "#1a1a2a" : "linear-gradient(135deg, #00ffa3, #00cc82)",
                color: "#0a0a0f", border: "none", borderRadius: 8, padding: "12px 24px",
                cursor: fetchingCF ? "wait" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                marginBottom: 24
              }}>
              {fetchingCF ? "⏳ Fetching from codeforces.com/api/..." : "🔄 Fetch Full Problem Set from CF API"}
            </button>

            {cfStats?.error && (
              <div style={{ padding: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#ef4444", fontSize: 13 }}>
                Failed to fetch from Codeforces API. This might be due to CORS restrictions — in production you'd proxy this request through a backend.
                The curated problem set above is pre-loaded and ready to use.
              </div>
            )}

            {cfStats && !cfStats.error && (
              <div className="fade-in">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                  <div className="stat-box">
                    <div style={{ fontSize: 32, fontWeight: 700, color: "#00ffa3" }}>{cfStats.total.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: "#6a6a80", marginTop: 4 }}>total problems</div>
                  </div>
                  <div className="stat-box">
                    <div style={{ fontSize: 32, fontWeight: 700, color: "#3b82f6" }}>{Object.keys(cfStats.tagCount).length}</div>
                    <div style={{ fontSize: 12, color: "#6a6a80", marginTop: 4 }}>unique tags</div>
                  </div>
                  <div className="stat-box">
                    <div style={{ fontSize: 32, fontWeight: 700, color: "#a855f7" }}>{Object.keys(cfStats.ratingDist).length}</div>
                    <div style={{ fontSize: 12, color: "#6a6a80", marginTop: 4 }}>rating levels</div>
                  </div>
                </div>

                <h4 style={{ fontSize: 13, color: "#8888a0", marginBottom: 12, fontFamily: "'Space Grotesk', sans-serif" }}>TAG DISTRIBUTION</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
                  {Object.entries(cfStats.tagCount).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([tag, count]) => (
                    <span key={tag} style={{
                      padding: "4px 10px", borderRadius: 16, fontSize: 11,
                      background: "rgba(0,255,163,0.06)", border: "1px solid rgba(0,255,163,0.15)", color: "#a0a0b8"
                    }}>
                      {tag} <span style={{ color: "#00ffa3", fontWeight: 600 }}>{count}</span>
                    </span>
                  ))}
                </div>

                <h4 style={{ fontSize: 13, color: "#8888a0", marginBottom: 12, fontFamily: "'Space Grotesk', sans-serif" }}>RATING DISTRIBUTION</h4>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120 }}>
                  {Object.entries(cfStats.ratingDist).sort((a, b) => +a[0] - +b[0]).map(([rating, count]) => {
                    const maxCount = Math.max(...Object.values(cfStats.ratingDist));
                    const h = (count / maxCount) * 100;
                    const color = +rating <= 1200 ? "#22c55e" : +rating <= 1600 ? "#3b82f6" : +rating <= 2000 ? "#a855f7" : +rating <= 2400 ? "#f59e0b" : "#ef4444";
                    return (
                      <div key={rating} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }} title={`${rating}: ${count} problems`}>
                        <div style={{ width: "100%", height: `${h}%`, background: color, borderRadius: "2px 2px 0 0", minHeight: 2 }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#55556a", marginTop: 4 }}>
                  <span>800</span><span>1600</span><span>2400</span><span>3200+</span>
                </div>
              </div>
            )}

            {!cfStats && !fetchingCF && (
              <div style={{ padding: 24, textAlign: "center", color: "#55556a", fontSize: 13 }}>
                <p style={{ marginBottom: 8 }}>The full Codeforces graph lets you find related problems beyond the curated set.</p>
                <p>Hit the button above to pull the complete dataset.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
