for(const year of [-1,0,9999,10000]){
    const date=new Date(0);date.setUTCFullYear(year);
    console.log(date.toISOString());console.log(date.toUTCString());console.log(date.toDateString());
}
