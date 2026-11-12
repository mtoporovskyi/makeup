export abstract class BaseHelper {
  /**
   * Reads a required item without losing its element type.
   *
   * @typeParam T - Element type shared by the collection and returned item.
   * @param items - Collection containing the expected item.
   * @param index - Zero-based position; negative positions count from the end.
   * @param message - Context included in an error for a missing item.
   * @returns The existing item at the requested position.
   * @throws Error when the position is unavailable or contains undefined.
   */
  protected static getRequiredItem<T>(items: readonly T[], index: number, message: string): T {
    const item = items.at(index);

    if (item === undefined) {
      throw new Error(message);
    }

    return item;
  }
}
