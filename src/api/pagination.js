const DEFAULT_TAKE = 20;
const MAX_TAKE = 100;

function toInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, deepClone(val)]));
  }
  return value;
}

function mergeNestedSelect(target, patch) {
  return Object.entries(patch).reduce((acc, [key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const clonedValue = deepClone(value);
      if (clonedValue.select) {
        const existing = acc[key] && typeof acc[key] === 'object' ? acc[key] : {};
        const existingSelect = existing.select && typeof existing.select === 'object' ? existing.select : {};
        acc[key] = {
          ...existing,
          select: mergeNestedSelect({ ...existingSelect }, clonedValue.select),
        };
      } else {
        acc[key] = {
          ...((acc[key] && typeof acc[key] === 'object') ? acc[key] : {}),
          ...clonedValue,
        };
      }
    } else {
      acc[key] = value;
    }
    return acc;
  }, target);
}

function parseList(value) {
  if (Array.isArray(value)) {
    return value.flatMap(parseList);
  }
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

export function parsePaginationParams(query = {}, options = {}) {
  const { defaultTake = DEFAULT_TAKE, maxTake = MAX_TAKE } = options;

  let take = defaultTake;
  if (query.take !== undefined) {
    const parsedTake = toInt(query.take);
    if (parsedTake === null) {
      throw new Error('The "take" query parameter must be a number.');
    }
    if (parsedTake < 1) {
      throw new Error('The "take" query parameter must be at least 1.');
    }
    if (parsedTake > maxTake) {
      throw new Error(`The "take" query parameter cannot exceed ${maxTake}.`);
    }
    take = parsedTake;
  }

  let skip;
  if (query.skip !== undefined) {
    const parsedSkip = toInt(query.skip);
    if (parsedSkip === null || parsedSkip < 0) {
      throw new Error('The "skip" query parameter must be a positive integer.');
    }
    skip = parsedSkip;
  }

  let cursor;
  if (query.cursor !== undefined) {
    if (typeof query.cursor !== 'string' || query.cursor.trim().length === 0) {
      throw new Error('The "cursor" query parameter must be a non-empty string.');
    }
    cursor = query.cursor;
  }

  if (cursor && skip !== undefined) {
    throw new Error('The "skip" and "cursor" query parameters cannot be used together.');
  }

  return { take, skip, cursor };
}

export function parseFilterParams(query = {}, allowedFilters = {}) {
  return Object.entries(allowedFilters).reduce((acc, [name, config]) => {
    const value = query[name];
    if (value === undefined) {
      return acc;
    }

    const { type = 'string', values: allowedValues, transform } = config || {};
    let parsedValue = value;

    if (type === 'number') {
      const parsedNumber = toInt(value);
      if (parsedNumber === null) {
        throw new Error(`Invalid number provided for "${name}".`);
      }
      parsedValue = parsedNumber;
    } else if (type === 'boolean') {
      if (typeof value === 'string') {
        if (!['true', 'false'].includes(value.toLowerCase())) {
          throw new Error(`Invalid boolean provided for "${name}".`);
        }
        parsedValue = value.toLowerCase() === 'true';
      } else if (typeof value !== 'boolean') {
        throw new Error(`Invalid boolean provided for "${name}".`);
      }
    } else if (type === 'string') {
      if (typeof value !== 'string') {
        throw new Error(`Invalid string provided for "${name}".`);
      }
      parsedValue = value.trim();
    }

    if (allowedValues && !allowedValues.includes(parsedValue)) {
      throw new Error(`Invalid value provided for "${name}".`);
    }

    acc[name] = transform ? transform(parsedValue) : parsedValue;
    return acc;
  }, {});
}

export function parseProjectionParams(query = {}, options = {}) {
  const {
    allowedSelectFields = [],
    defaultSelect,
    requiredFields = [],
    allowedIncludes = {},
    defaultIncludes = [],
  } = options;

  let select = defaultSelect ? deepClone(defaultSelect) : undefined;

  if (query.select !== undefined) {
    if (!allowedSelectFields.length) {
      throw new Error('Field selection is not supported for this resource.');
    }
    const requestedFields = parseList(query.select);
    if (!requestedFields.length) {
      throw new Error('The "select" query parameter must specify at least one field.');
    }
    const invalidFields = requestedFields.filter(field => !allowedSelectFields.includes(field));
    if (invalidFields.length) {
      throw new Error(`Invalid select field(s): ${invalidFields.join(', ')}.`);
    }
    select = {};
    const fieldsToApply = new Set([...requiredFields, ...requestedFields]);
    fieldsToApply.forEach(field => {
      select[field] = true;
    });
  } else if (requiredFields.length) {
    select = select ? select : {};
    requiredFields.forEach(field => {
      if (select[field] === undefined) {
        select[field] = true;
      }
    });
  }

  const includeValues = parseList(query.include);
  const mergedIncludes = [...new Set([...defaultIncludes, ...includeValues])];
  if (mergedIncludes.length) {
    if (!Object.keys(allowedIncludes).length) {
      throw new Error('Including related records is not supported for this resource.');
    }
    select = select ? select : {};
    mergedIncludes.forEach(path => {
      if (!allowedIncludes[path]) {
        throw new Error(`Invalid include path: ${path}.`);
      }
      const patch = { [path]: allowedIncludes[path] };
      mergeNestedSelect(select, patch);
    });
  }

  return { select: select && Object.keys(select).length ? select : undefined };
}

export const paginationDefaults = {
  DEFAULT_TAKE,
  MAX_TAKE,
};
