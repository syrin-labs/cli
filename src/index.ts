import { greet, add } from '@/utils/helper';

function main(): void {
  const message = greet('Syrin');
  console.log(message);

  const result = add(5, 3);
  console.log(`5 + 3 = ${result}`);
}

main();
