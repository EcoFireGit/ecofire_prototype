// __tests__/math.test.ts
import { add } from '../utils/math';

test('adds numbers correctly', () => {
  expect(add(1, 2)).toBe(3);  // Expect 1 + 2 to equal 3
  expect(add(-1, 2)).toBe(1);  // Test with negative numbers
});
