-- smartcooked · Stammdaten Einkauf
insert into shopping_categories (id, name, sort, icon) values
 ('obst_gemuese','Obst & Gemüse',10,'i-leaf'), ('brot','Brot & Backwaren',20,'i-bread'), ('milchprodukte','Milchprodukte & Eier',30,'i-egg'),
 ('fleisch_fisch','Fleisch & Fisch',40,'i-flame'), ('fleischersatz','Fleischersatz & Tofu',50,'i-leaf'), ('tiefkuehl','Tiefkühl',60,'i-rest'),
 ('nudeln_reis','Nudeln, Reis & Getreide',70,'i-bowl'), ('konserven','Konserven & Saucen',80,'i-cloche'), ('gewuerze','Gewürze & Öle',90,'i-drop'),
 ('backen','Backen & Süßes',100,'i-star'), ('getraenke','Getränke',110,'i-drop'), ('snacks','Snacks',120,'i-spark'),
 ('haushalt','Haushalt & Drogerie',130,'i-note'), ('sonstiges','Sonstiges',999,'i-info')
on conflict (id) do nothing;

insert into ingredient_keywords (keyword, category_id, canonical_name, is_staple) values
 ('milch','milchprodukte',null,false),('mandelmilch','milchprodukte',null,false),('joghurt','milchprodukte',null,false),('magerquark','milchprodukte','Magerquark',false),('quark','milchprodukte',null,false),('skyr','milchprodukte',null,false),
 ('käse','milchprodukte',null,false),('mozzarella','milchprodukte',null,false),('gratinkäse','milchprodukte',null,false),('frischkäse','milchprodukte',null,false),('sahne','milchprodukte',null,false),('butter','milchprodukte',null,true),('ei','milchprodukte','Eier',false),('eier','milchprodukte','Eier',false),
 ('tomate','obst_gemuese','Tomaten',false),('tomaten','obst_gemuese','Tomaten',false),('cherrytomate','obst_gemuese','Cherrytomaten',false),('passierte tomaten','konserven','Passierte Tomaten',false),('tomatenmark','konserven',null,false),
 ('kartoffel','obst_gemuese','Kartoffeln',false),('zwiebel','obst_gemuese','Zwiebeln',false),('gemüsezwiebel','obst_gemuese','Gemüsezwiebel',false),('knoblauch','obst_gemuese',null,false),('paprika','obst_gemuese',null,false),('gurke','obst_gemuese',null,false),
 ('salat','obst_gemuese',null,false),('eisbergsalat','obst_gemuese',null,false),('rucola','obst_gemuese',null,false),('brokkoli','obst_gemuese',null,false),('zitrone','obst_gemuese',null,false),('limette','obst_gemuese',null,false),
 ('mango','tiefkuehl',null,false),('himbeeren','tiefkuehl',null,false),('birne','obst_gemuese',null,false),('mais','konserven',null,false),('kidneybohnen','konserven',null,false),('jalapeños','konserven',null,false),('gewürzgurke','konserven','Gewürzgurken',false),('coleslaw','obst_gemuese',null,false),
 ('hähnchen','fleisch_fisch',null,false),('hähnchenbrust','fleisch_fisch',null,false),('chicken','fleisch_fisch',null,false),('rinderhack','fleisch_fisch',null,false),('hackfleisch','fleisch_fisch',null,false),('lachs','fleisch_fisch',null,false),('thunfisch','konserven',null,false),
 ('veggie hack','fleischersatz','Veggie Hack',false),('veganes hack','fleischersatz','Veggie Hack',false),('veggie gyros','fleischersatz',null,false),('veggie döner','fleischersatz',null,false),('veggie chunks','fleischersatz',null,false),('tofu','fleischersatz',null,false),('maultaschen','tiefkuehl',null,false),
 ('pommes','tiefkuehl',null,false),('wedges','tiefkuehl',null,false),('nuggets','tiefkuehl',null,false),
 ('nudeln','nudeln_reis',null,false),('pasta','nudeln_reis',null,false),('lasagneblätter','nudeln_reis',null,false),('reis','nudeln_reis',null,false),('quinoa','nudeln_reis',null,false),('haferflocken','nudeln_reis',null,false),('schmelzflocken','nudeln_reis',null,false),('couscous','nudeln_reis',null,false),
 ('mehl','backen',null,true),('zucker','backen',null,true),('backpulver','backen',null,true),('puddingpulver','backen',null,false),('proteinpulver','backen',null,false),('whey','backen',null,false),('chunky flavour','backen',null,false),('protein pudding','milchprodukte',null,false),('protein sahne','backen',null,false),
 ('brot','brot',null,false),('brötchen','brot',null,false),('bun','brot','Burger-Brötchen',false),('tortilla','brot',null,false),('wrap','brot',null,false),
 ('salz','gewuerze',null,true),('pfeffer','gewuerze',null,true),('öl','gewuerze',null,true),('olivenöl','gewuerze',null,true),('essig','gewuerze',null,true),('balsamico','gewuerze',null,true),('senf','konserven',null,true),('ketchup','konserven',null,true),('pesto','konserven',null,false),
 ('gewürz','gewuerze',null,true),('taco-gewürz','gewuerze',null,true),('taco gewürz','gewuerze',null,true),('pommes-gewürz','gewuerze',null,true),('oregano','gewuerze',null,true),('paprikapulver','gewuerze',null,true),('curry','gewuerze',null,true),('zimt','gewuerze',null,true),('knoblauchpulver','gewuerze',null,true),('brühe','gewuerze',null,true),('sojasauce','konserven',null,true),
 ('wasser','sonstiges',null,true),('süßstoff','backen',null,true),
 ('nachos','snacks',null,false),('tortillachips','snacks',null,false),('chips','snacks',null,false),
 ('toilettenpapier','haushalt',null,false),('spülmittel','haushalt',null,false),('küchenrolle','haushalt',null,false),('müllbeutel','haushalt',null,false)
on conflict (keyword) do nothing;
