module.exports = {
  /**
   * Given a source object and a target object, recursively create an object with keys that are present in source
   * but not in target
   * @param {Object} source
   * @param {Object} target
   * @returns the diff object
   */
  diff: function (source, target) {
    if (this.isObject(source))
      return Object.keys(source).reduce((acc, key) => {
        if (!target.hasOwnProperty(key)) acc[key] = source[key];
        else {
          const result = this.diff(source[key], target[key]);
          if (result && Object.keys(result).length > 0) {
            acc[key] = result;
          }
        }
        return acc;
      }, {});
  },

  /**
   * Given a source, keep only the keys corresponding to the selected
   * languages. This overwrites current values.
   * @param {Object} source
   * @param {Array<string>} selectedLanguages
   */
  filterLanguages: function (source, selectedLanguages) {
    Object.keys(source).forEach((sourceKey) => {
      if (sourceKey === "base" || !isNaN(Number(sourceKey))) {
        source[sourceKey] = Object.keys(source[sourceKey]).reduce(
          (acc, key) => {
            if (selectedLanguages.includes(key))
              acc[key] = source[sourceKey][key];
            return acc;
          },
          {}
        );
      }
    });
  },

  /**
   * Given a source object and a target object, recursively update targets keys with all the keys that are
   * present in source but not in target
   * @param {Object} source
   * @param {Object} target
   * @returns the source and the target with the updated keys
   */
  updateKeys: function (source, target) {
    if (this.isObject(source)) {
      const sourceKeys = Object.keys(source);
      sourceKeys.forEach((key) => {
        if (!target.hasOwnProperty(key)) target[key] = source[key];
        else {
          this.updateKeys(source[key], target[key]);
        }
      });
    }

    return [source, target];
  },

  /**
   * Check if the given input is an object different than null and Array
   * @param {any} object
   * @returns true if input is an object but not Array nor null, false otherwise
   */
  isObject: function (object) {
    return (
      object !== null && !Array.isArray(object) && typeof object === "object"
    );
  },

  /**
   * Check if the given input is a string
   * @param {any} object
   * @returns true if input is a string, false otherwise
   */
  isString: function (object) {
    return typeof object === "string" || object instanceof String;
  },
};
