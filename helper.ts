export const assert = (condition: boolean, description?: string) => {
    if (condition) {
        return;
    } else {
        throw Error(description)
    }
}
