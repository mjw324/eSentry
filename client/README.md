# Client Notes
## To start:
1. `cd client/esentry`
2. `npm install`
3. `npm start`

## TODO
- [ ] Add "settings" tab to client to allow users to change notification settings.
- [ ] Add "delete" button to client to allow users to delete a monitor.
- [ ] Add "edit" button to client to allow users to edit a monitor.


### Code Notes

For GET requests
```ts
//Fetch function
  async fetchMonitors(userid: string) {
      const data = await fetch(environment.url + '/monitors',{
        method:"GET",
        headers:{
          'userid':userid //Querry params 
        }
      }).catch((error)=>{ //Catch errors
        this.messageService.add({severity:"error",summary:"Error",detail:error.message})
        this.monitors.next([])
        return
      })
      data?.json().then((monitors)=>{ //Parse promise for data
        this.monitors.next(monitors)
      })
  }

```


