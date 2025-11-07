import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { authComponent } from './auth';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }
    const userId = user._id;
    return await ctx.db
      .query('datasources')
      .withIndex('by_createdBy', (q) => q.eq('createdBy', userId))
      .collect();
  },
});

export const get = query({
  args: {
    id: v.id('datasources'),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }
    const datasource = await ctx.db.get(args.id);
    if (!datasource || datasource.createdBy !== user._id) {
      return null;
    }
    return datasource;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await authComponent.getAuthUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    storageId: v.id('_storage'),
    columnTypes: v.record(
      v.string(),
      v.union(v.literal('string'), v.literal('number'), v.literal('date')),
    ),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    return await ctx.db.insert('datasources', {
      name: args.name,
      fileName: args.fileName,
      fileSize: args.fileSize,
      storageId: args.storageId,
      columnTypes: args.columnTypes,
      createdBy: user._id,
    });
  },
});

export const getStorageUrl = query({
  args: {
    datasourceId: v.id('datasources'),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }
    const datasource = await ctx.db.get(args.datasourceId);
    if (!datasource || datasource.createdBy !== user._id) {
      return null;
    }
    return await ctx.storage.getUrl(datasource.storageId);
  },
});

// function parseCsvToData(
//   csvContent: string,
// ): Array<Record<string, string | number>> {
//   const lines = csvContent.split(/\r?\n/).filter((line) => line.trim() !== '');

//   if (lines.length === 0) {
//     return [];
//   }

//   const headers = parseCsvLine(lines[0]);
//   const data: Array<Record<string, string | number>> = [];

//   for (let i = 1; i < lines.length; i++) {
//     const values = parseCsvLine(lines[i]);

//     if (values.length !== headers.length) {
//       continue;
//     }

//     const row: Record<string, string | number> = {};
//     for (let j = 0; j < headers.length; j++) {
//       const header = headers[j];
//       let value: string | number = values[j] || '';
//       const trimmedValue = String(value).trim();

//       if (trimmedValue !== '') {
//         const numValue = Number(trimmedValue);
//         if (!isNaN(numValue) && trimmedValue !== '') {
//           value = numValue;
//         }
//       }

//       row[header] = value;
//     }
//     data.push(row);
//   }

//   return data;
// }

// export const getCsvData = action({
//   args: {
//     datasourceId: v.id('datasources'),
//   },
//   returns: v.array(v.record(v.string(), v.union(v.string(), v.number()))),
//   handler: async (
//     ctx,
//     args,
//   ): Promise<Array<Record<string, string | number>>> => {
//     const user = await authComponent.getAuthUser(ctx);
//     const datasource = await ctx.runQuery(api.datasources.get, {
//       id: args.datasourceId,
//     });

//     if (!datasource || datasource.createdBy !== user._id) {
//       return [];
//     }

//     const storageUrl = await ctx.runQuery(api.datasources.getStorageUrl, {
//       datasourceId: args.datasourceId,
//     });

//     if (!storageUrl) {
//       return [];
//     }

//     const response = await fetch(storageUrl);
//     if (!response.ok) {
//       return [];
//     }

//     const csvContent = await response.text();
//     return parseCsvToData(csvContent);
//   },
// });

export const updateColumnType = mutation({
  args: {
    datasourceId: v.id('datasources'),
    columnName: v.string(),
    columnType: v.union(
      v.literal('string'),
      v.literal('number'),
      v.literal('date'),
    ),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const datasource = await ctx.db.get(args.datasourceId);

    if (!datasource || datasource.createdBy !== user._id) {
      throw new Error('Datasource not found or unauthorized');
    }

    const columnTypes = datasource.columnTypes || {};
    columnTypes[args.columnName] = args.columnType;

    await ctx.db.patch(args.datasourceId, {
      columnTypes,
    });
  },
});

export const updateName = mutation({
  args: {
    datasourceId: v.id('datasources'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const datasource = await ctx.db.get(args.datasourceId);

    if (!datasource || datasource.createdBy !== user._id) {
      throw new Error('Datasource not found or unauthorized');
    }

    await ctx.db.patch(args.datasourceId, {
      name: args.name.trim(),
    });
  },
});
