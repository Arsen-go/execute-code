const { unlinkSync } = require("fs");
const { join } = require("path");

const removeCodeFile = async (uuid, lang, outputExt) => {
  const codeFile = join(process.cwd(), `codes/${uuid}.${lang}`),
    outputFile = join(process.cwd(), `outputs/${uuid}.${outputExt}`); // TODO

  unlinkSync(codeFile);

  if (outputExt) unlinkSync(outputFile);
};

module.exports = {
  removeCodeFile,
};
