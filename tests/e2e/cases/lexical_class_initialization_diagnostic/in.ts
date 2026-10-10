function makeOwner(): any {
    class Local { constructor(public field: any = 1) {} }
    return Local;
}
makeOwner();
