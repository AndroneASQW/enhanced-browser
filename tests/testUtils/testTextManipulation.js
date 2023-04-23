const textManipulation = require('../../src/utils/textManipulation');

test('CISAFE-Testing separators collapsing', () => {
  const textToProcess = '  Lorep   \n ipsum \t   dolor sit      amet   \n\n';
  const expectedResult = 'Lorep ipsum dolor sit amet';

  expect(textManipulation.collapseSeparators(textToProcess))
    .toStrictEqual(expectedResult);
});
