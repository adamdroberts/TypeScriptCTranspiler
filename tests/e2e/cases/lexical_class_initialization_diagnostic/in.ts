function makeOwner(): any {
    class Local { field: any = 1; }
    return Local;
}
makeOwner();
