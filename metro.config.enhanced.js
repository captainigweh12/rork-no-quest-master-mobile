const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for .cjs files (CommonJS modules)
config.resolver.sourceExts.push('cjs');

// Enhanced error reporting
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
  minifierConfig: {
    keep_classnames: true,
    keep_fnames: true,
    mangle: {
      keep_classnames: true,
      keep_fnames: true,
    },
  },
};

// Add custom serializer for better error tracking
const originalSerializer = config.serializer.customSerializer;
config.serializer.customSerializer = (entryPoint, preModules, graph, options) => {
  try {
    console.log(`[Metro] Bundling entry point: ${entryPoint}`);
    
    // Call original serializer if it exists
    if (originalSerializer) {
      return originalSerializer(entryPoint, preModules, graph, options);
    }
    
    // Default serialization
    return require('metro/src/DeltaBundler/Serializers').baseJSBundle(
      entryPoint,
      preModules,
      graph,
      options
    );
  } catch (error) {
    console.error('[Metro] Bundling error:', error);
    console.error('[Metro] Entry point:', entryPoint);
    console.error('[Metro] Error stack:', error.stack);
    throw error;
  }
};

// Enhanced resolver with better error messages
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  } catch (error) {
    console.error(`[Metro] Failed to resolve module: ${moduleName}`);
    console.error(`[Metro] Context origin: ${context.originModulePath}`);
    console.error(`[Metro] Platform: ${platform}`);
    console.error(`[Metro] Error: ${error.message}`);
    throw new Error(
      `Cannot resolve module '${moduleName}' from '${context.originModulePath}': ${error.message}`
    );
  }
};

// Watch all files for changes
config.watchFolders = [
  path.resolve(__dirname),
];

// Better caching
config.cacheStores = [
  new (require('metro-cache').FileStore)({
    root: path.join(__dirname, '.metro-cache'),
  }),
];

// Enhanced reporter
config.reporter = {
  update(event) {
    // Log bundling progress
    if (event.type === 'bundle_build_started') {
      console.log('[Metro] Bundle build started...');
    } else if (event.type === 'bundle_build_done') {
      console.log('[Metro] Bundle build completed successfully');
    } else if (event.type === 'bundle_build_failed') {
      console.error('[Metro] Bundle build failed');
    } else if (event.type === 'bundling_error') {
      console.error('[Metro] Bundling error:', event.error);
      if (event.error.stack) {
        console.error('[Metro] Stack trace:', event.error.stack);
      }
    } else if (event.type === 'transform_cache_reset') {
      console.log('[Metro] Transform cache reset');
    }
  },
};

module.exports = config;
