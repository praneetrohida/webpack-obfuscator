"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const javascript_obfuscator_1 = __importDefault(require("javascript-obfuscator"));
const webpack_sources_1 = require("webpack-sources");
const multimatch_1 = __importDefault(require("multimatch"));
const transferSourceMap = require("multi-stage-sourcemap").transfer;
class WebpackObfuscator {
    constructor(options = {}, excludes) {
        this.options = options;
        this.excludes = [];
        this.excludes = this.excludes.concat(excludes || []);
    }
    apply(compiler) {
        const isDevServer = process.argv.find(v => v.includes("webpack-dev-server"));
        if (isDevServer) {
            console.info("JavascriptObfuscator is disabled on webpack-dev-server as the reloading scripts ", "and the obfuscator can interfere with each other and break the build");
            return;
        }
        const pluginName = this.constructor.name;
        compiler.hooks.compilation.tap(pluginName, compilation => {
            compilation.hooks.afterOptimizeChunkAssets.tap(pluginName, chunks => {
                Array.from(chunks)
                    .reduce((acc, chunk) => acc.concat(chunk.files || []), [])
                    .concat(compilation.additionalChunkAssets || [])
                    .forEach((file) => {
                    if (!file.toLowerCase().endsWith(".js") ||
                        this.shouldExclude(file)) {
                        return;
                    }
                    const asset = compilation.assets[file];
                    const { inputSource, inputSourceMap } = this.extractSourceAndSourceMap(asset);
                    const { obfuscatedSource, obfuscationSourceMap } = this.obfuscate(inputSource);
                    if (this.options.sourceMap && inputSourceMap) {
                        const transferredSourceMap = transferSourceMap({
                            fromSourceMap: obfuscationSourceMap,
                            toSourceMap: inputSourceMap
                        });
                        compilation.assets[file] = new webpack_sources_1.SourceMapSource(obfuscatedSource, file, transferredSourceMap, inputSource, inputSourceMap);
                    }
                    else {
                        compilation.assets[file] = new webpack_sources_1.RawSource(obfuscatedSource);
                    }
                });
            });
        });
    }
    shouldExclude(filePath) {
        return multimatch_1.default(filePath, this.excludes).length > 0;
    }
    extractSourceAndSourceMap(asset) {
        if (asset.sourceAndMap) {
            const { source, map } = asset.sourceAndMap();
            return { inputSource: source, inputSourceMap: map };
        }
        else {
            return {
                inputSource: asset.source(),
                inputSourceMap: asset.map()
            };
        }
    }
    obfuscate(javascript) {
        const obfuscationResult = javascript_obfuscator_1.default.obfuscate(javascript, this.options);
        return {
            obfuscatedSource: obfuscationResult.getObfuscatedCode(),
            obfuscationSourceMap: obfuscationResult.getSourceMap()
        };
    }
}
module.exports = WebpackObfuscator;
