export const DATA_PAGE_SIZE = 1000;

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

/** Read every PostgREST page instead of silently stopping at its row cap. */
export async function readAllPages<T>(
  readPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = DATA_PAGE_SIZE,
): Promise<PageResult<T>> {
  const data: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const result = await readPage(from, from + pageSize - 1);
    if (result.error || !result.data) return result;

    data.push(...result.data);
    if (result.data.length < pageSize) return { data, error: null };
  }
}
