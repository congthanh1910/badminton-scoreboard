import { useEffect, useState } from 'react';
import { Auth, type IMatch, Match } from '@/lib/firebase';
import { Provider } from 'jotai';
import { create } from 'zustand';
import { produce } from 'immer';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Nullable } from '@/utils/types';
import { type User } from 'firebase/auth';
import { Link, useSearchParams } from 'react-router-dom';
import { IcHome } from '@/components/icons/ic-home';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import get from 'lodash/get';
import { useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/utils/cn';
import { IcMinus } from '@/components/icons/ic-minus';
import { IcPlus } from '@/components/icons/ic-plus';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const useAuth = create<{
  user: Nullable<User>;
  setUser: (user: Nullable<User>) => void;
  status: 'loading' | 'authorized' | 'unauthorized';
  setStatus: (status: 'authorized' | 'unauthorized') => void;
}>(set => ({
  user: null,
  setUser: user =>
    set(state =>
      produce(state, draft => {
        draft.user = user;
      })
    ),
  status: 'loading',
  setStatus: status =>
    set(state =>
      produce(state, draft => {
        draft.status = status;
      })
    ),
}));

function useControl() {
  const [params, setParams] = useSearchParams();
  const key = 'm';
  const id = params.get(key);
  function navigate(id: string) {
    params.set(key, id);
    setParams(params);
  }
  return { id, key, navigate };
}

export default function Page() {
  const { id } = useControl();
  const status = useAuth(state => state.status);

  return (
    <Provider>
      {status !== 'loading' && (
        <div className="container h-full flex flex-col">
          <header className="flex justify-end items-center gap-2 pt-2 pb-0">
            <UserInfo />
            <AuthButton />
          </header>
          <nav className="p-1">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <Button asChild>
                    <Link to="/">
                      <IcHome />
                    </Link>
                  </Button>
                </BreadcrumbItem>
                {id && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Match {id}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </nav>
          {status === 'authorized' && (
            <section className="hide-scrollbar min-h-0 flex-1 overflow-auto">
              {!id ? <Dashboard /> : <MatchBoard id={id} />}
            </section>
          )}
          {status === 'unauthorized' && (
            <p className="font-bold text-xl text-center m-10">Login to continue</p>
          )}
        </div>
      )}
      <AuthObserver />
    </Provider>
  );
}

const auth = new Auth();

function AuthObserver() {
  const setStatus = useAuth(state => state.setStatus);
  const setUser = useAuth(state => state.setUser);
  useEffect(() => {
    return auth.onStateChanged(user => {
      setStatus(!user ? 'unauthorized' : 'authorized');
      setUser(user);
    });
  }, [setStatus, setUser]);
  return null;
}

function UserInfo() {
  const user = useAuth(state => state.user);
  if (!user) return <p className="text-sm">Guest</p>;
  const email = user.email;
  if (!email) return <p className="text-sm">User {user.uid}</p>;
  return <div>{get(email.split('@'), 0)}</div>;
}

function AuthButton() {
  const user = useAuth(state => state.user);
  const [isOpen, setOpen] = useState(false);
  const [, setParams] = useSearchParams();
  async function logout() {
    await auth.logout();
    setParams();
  }
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {!user ? (
        <DialogTrigger asChild>
          <Button>Login</Button>
        </DialogTrigger>
      ) : (
        <Button onClick={logout}>Logout</Button>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Login</DialogTitle>
        </DialogHeader>
        <LoginForm onSubmitted={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function LoginForm({ onSubmitted }: { onSubmitted: VoidFunction }) {
  const [error, setError] = useState('');
  const schema = z.object({
    email: z
      .string()
      .trim()
      .min(1)
      .email()
      .transform(val => val.toLowerCase()),
    password: z.string().trim().min(6).max(32),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'demo@abc.xyz', password: '1234567890' },
  });

  const onSubmit = form.handleSubmit(async payload => {
    try {
      await auth.login(payload.email, payload.password);
      onSubmitted();
    } catch {
      setError('Something went wrong!');
    }
  });

  const {
    formState: { isSubmitting },
  } = form;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <div className="space-y-2">
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input autoComplete="email" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </div>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <div className="space-y-2">
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input {...field} type="password" disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </div>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Submit
        </Button>
        <p className="text-destructive">{error}</p>
      </form>
    </Form>
  );
}

const match = new Match();

function Dashboard() {
  const { navigate } = useControl();
  const { mutate, isPending } = useMutation({
    mutationFn: () => match.create().then(snapshot => snapshot.id),
    throwOnError: false,
    onSuccess(id) {
      navigate(id);
    },
  });
  return (
    <div className="flex justify-center">
      <Button disabled={isPending} onClick={() => mutate()}>
        Create
      </Button>
    </div>
  );
}

function MatchBoard({ id }: { id: string }) {
  const [data, setData] = useState<Nullable<IMatch>>(null);
  useEffect(() => {
    return match.onListener(id, setData);
  }, [id]);
  const [tab, setTab] = useState<'st' | 'nd' | 'rd'>('st');
  if (!data) return null;
  const props = { data, id };
  return (
    <Tabs
      value={tab}
      onValueChange={newValue => {
        if (newValue === 'st' || newValue === 'nd' || newValue === 'rd') setTab(newValue);
      }}
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="st">1st</TabsTrigger>
        <TabsTrigger value="nd">2nd</TabsTrigger>
        <TabsTrigger value="rd">3rd</TabsTrigger>
      </TabsList>
      <MatchBoardContent {...props} tab="st" />
      <MatchBoardContent {...props} tab="nd" />
      <MatchBoardContent {...props} tab="rd" />
    </Tabs>
  );
}

function MatchBoardContent({
  data,
  id,
  tab,
}: {
  data: IMatch;
  id: string;
  tab: 'st' | 'nd' | 'rd';
}) {
  const { mutate: updateScore, isPending: isPendingUpdateScore } = useMutation({
    mutationFn: (args: ['a' | 'b', number]) => match.updateScore(id, tab, ...args),
    throwOnError: false,
  });
  const [isPendingPlayer, setPendingPlayer] = useState(false);
  async function updateServe(team: 'a' | 'b', idx: 0 | 1, checked: 'indeterminate' | boolean) {
    const player = produce(data.set[tab].player, draft => {
      draft.a[0].serve = false;
      draft.a[1].serve = false;
      draft.b[0].serve = false;
      draft.b[1].serve = false;
      draft[team][idx].serve = checked === 'indeterminate' ? false : checked;
    });
    setPendingPlayer(true);
    return match.updatePlayer(id, tab, player).finally(() => setPendingPlayer(false));
  }
  async function updateSwap(team: 'a' | 'b') {
    const player = produce(data.set[tab].player, draft => {
      draft[team].reverse();
    });
    setPendingPlayer(true);
    return match.updatePlayer(id, tab, player).finally(() => setPendingPlayer(false));
  }
  return (
    <TabsContent value={tab} className="grid grid-cols-2 gap-1 mt-0">
      <Card className="mt-2">
        <div>
          <DialogNameForm id={id} data={data} tab={tab} team="a" />
          <p className="text-center text-4xl font-bold">{data.set[tab].score.a}</p>
          <DialogPlayerNameForm id={id} data={data} tab={tab} team="a" />
        </div>
      </Card>
      <Card className="mt-2">
        <div>
          <DialogNameForm id={id} data={data} tab={tab} team="b" />
          <p className="text-center text-4xl font-bold">{data.set[tab].score.b}</p>
          <DialogPlayerNameForm id={id} data={data} tab={tab} team="b" />
        </div>
      </Card>
      <Drawer>
        <DrawerTrigger className="mt-2 col-span-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium">
          Setting
        </DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-4">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      disabled={isPendingUpdateScore || data.set[tab].score.a === 0}
                      onClick={() => updateScore(['a', -1])}
                    >
                      <IcMinus />
                    </Button>
                    <div className="flex-1">
                      <p className="font-bold text-center text-4xl">{data.set[tab].score.a}</p>
                    </div>
                    <Button
                      size="icon"
                      disabled={isPendingUpdateScore}
                      onClick={() => updateScore(['a', 1])}
                    >
                      <IcPlus />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center justify-end">
                      <Label htmlFor="player-a-0-name" className="text-xl">
                        {data.set[tab].player.a[0].name}
                      </Label>
                      <div>
                        <Checkbox
                          className="size-5"
                          id="player-a-0-name"
                          checked={data.set[tab].player.a[0].serve}
                          disabled={isPendingPlayer}
                          onCheckedChange={checked => updateServe('a', 0, checked)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 items-center justify-end">
                      <Label htmlFor="player-a-1-name" className="text-xl">
                        {data.set[tab].player.a[1].name}
                      </Label>
                      <div>
                        <Checkbox
                          className="size-5"
                          id="player-a-1-name"
                          checked={data.set[tab].player.a[1].serve}
                          disabled={isPendingPlayer}
                          onCheckedChange={checked => updateServe('a', 1, checked)}
                        />
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => updateSwap('a')}>
                      Swap
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      disabled={isPendingUpdateScore || data.set[tab].score.b === 0}
                      onClick={() => updateScore(['b', -1])}
                    >
                      <IcMinus />
                    </Button>
                    <div className="flex-1">
                      <p className="font-bold text-center text-4xl">{data.set[tab].score.b}</p>
                    </div>
                    <Button
                      size="icon"
                      disabled={isPendingUpdateScore}
                      onClick={() => updateScore(['b', 1])}
                    >
                      <IcPlus />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center justify-start">
                      <div>
                        <Checkbox
                          className="size-5"
                          id="player-b-0-name"
                          checked={data.set[tab].player.b[0].serve}
                          disabled={isPendingPlayer}
                          onCheckedChange={checked => updateServe('b', 0, checked)}
                        />
                      </div>
                      <Label htmlFor="player-b-0-name" className="text-xl">
                        {data.set[tab].player.b[0].name}
                      </Label>
                    </div>
                    <div className="flex gap-2 items-center justify-start">
                      <div>
                        <Checkbox
                          className="size-5"
                          id="player-b-1-name"
                          checked={data.set[tab].player.b[1].serve}
                          disabled={isPendingPlayer}
                          onCheckedChange={checked => updateServe('b', 1, checked)}
                        />
                      </div>
                      <Label htmlFor="player-b-1-name" className="text-xl">
                        {data.set[tab].player.b[1].name}
                      </Label>
                    </div>
                    <Button className="w-full" onClick={() => updateSwap('b')}>
                      Swap
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </TabsContent>
  );
}

function StartServe({ active }: { active: boolean }) {
  return <div className={cn('size-4 rounded-full', active && 'bg-green-500')} />;
}

function DialogNameForm({
  id,
  data,
  tab,
  team,
}: {
  id: string;
  data: IMatch;
  tab: 'st' | 'nd' | 'rd';
  team: 'a' | 'b';
}) {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger className="w-full text-lg">{data.set[tab].name[team]}</DialogTrigger>
      <DialogContent>
        <NameForm
          id={id}
          set={tab}
          team={team}
          name={data.set[tab].name[team]}
          onSubmitted={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function NameForm({
  id,
  set,
  team,
  name,
  onSubmitted,
}: {
  id: string;
  set: 'st' | 'nd' | 'rd';
  team: 'a' | 'b';
  name: string;
  onSubmitted: VoidFunction;
}) {
  const schema = z.object({ name: z.string().min(1) });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name },
  });
  const onSubmit = form.handleSubmit(async payload => {
    await match.updateName(id, set, team, payload.name);
    form.reset(payload);
    onSubmitted();
  });

  const {
    formState: { isSubmitting },
  } = form;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <div className="space-y-1">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </div>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Update
        </Button>
      </form>
    </Form>
  );
}

function DialogPlayerNameForm({
  id,
  data,
  tab,
  team,
}: {
  id: string;
  data: IMatch;
  tab: 'st' | 'nd' | 'rd';
  team: 'a' | 'b';
}) {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="px-2">
          <div
            className={cn(
              'flex items-center gap-2 justify-end',
              team === 'b' && 'flex-row-reverse'
            )}
          >
            <p>{data.set[tab].player[team][0].name}</p>
            <StartServe active={data.set[tab].player[team][0].serve} />
          </div>
          <div
            className={cn(
              'flex items-center gap-2 justify-end',
              team === 'b' && 'flex-row-reverse'
            )}
          >
            <p>{data.set[tab].player[team][1].name}</p>
            <StartServe active={data.set[tab].player[team][1].serve} />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <PlayerNameForm
          id={id}
          set={tab}
          team={team}
          name1={data.set[tab].player[team][0].name}
          name2={data.set[tab].player[team][1].name}
          onSubmitted={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function PlayerNameForm({
  id,
  set,
  team,
  name1,
  name2,
  onSubmitted,
}: {
  id: string;
  set: 'st' | 'nd' | 'rd';
  team: 'a' | 'b';
  name1: string;
  name2: string;
  onSubmitted: VoidFunction;
}) {
  const schema = z.object({ name1: z.string().min(1), name2: z.string().min(1) });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name1, name2 },
  });
  const onSubmit = form.handleSubmit(async payload => {
    await match.updatePlayerName(id, set, team, payload.name1, payload.name2);
    form.reset(payload);
    onSubmitted();
  });

  const {
    formState: { isSubmitting },
  } = form;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="name1"
            render={({ field }) => (
              <div className="space-y-1">
                <FormLabel>Name player 1</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </div>
            )}
          />
          <FormField
            control={form.control}
            name="name2"
            render={({ field }) => (
              <div className="space-y-1">
                <FormLabel>Name player 2</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </div>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Update
        </Button>
      </form>
    </Form>
  );
}
