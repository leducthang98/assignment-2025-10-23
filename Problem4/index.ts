// Time complexity: O(n) - we iterate through all numbers from 1 to n
// Space complexity: O(1) - only using a single variable for accumulation
function sum_to_n_a(n: number): number {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i;
  }
  return sum;
}

// Time complexity: O(1) - constant time operation
// Space complexity: O(1) - no additional space needed
function sum_to_n_b(n: number): number {
  return (n * (n + 1)) / 2;
}


// Time complexity: O(n) - we make n recursive calls
// Space complexity: O(n) - call stack grows with each recursive call
function sum_to_n_c(n: number): number {
  if (n <= 1) return n;
  return n + sum_to_n_c(n - 1);
}
